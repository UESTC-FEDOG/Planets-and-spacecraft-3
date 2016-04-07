// console负责DOM的渲染，以及向Mediator发送广播。可以不需要一个指挥官
// spacecraftDOM负责将DOM和飞船一一对应起来。是私有的类，由console使用
(function(_, $) {

    _.templateSettings = {
        interpolate: /\{\{(.+?)\}\}/g,
        evaluate:  /\{%([\s\S]+?)%\}/g
    };

    var panelTemplate,
        engineTypeTemplate,
        energyTypeTemplate;

    // 模板写在HTML文件里了，因此需要异步生成模板函数
    $(function() {
        panelTemplate = _.template($('#spacecraft-panel-template').html());
        engienTypeTemplate = _.template($('#engine-type').html());
        energyTypeTemplate = _.template($('#energy-type').html());
        tableRowTemplate = _.template($('#table-row-template').html());
    });

    var engineType = [
        {
            name: '前进号',
            speed: 30,
            cusumeRate: 5
        },
        {
            name: '奔腾号',
            speed: 50,
            cusumeRate: 7
        },
        {
            name: '超越号',
            speed: 80,
            cusumeRate: 9
        }
    ],
    
       energyType = [
           {
               name: '劲量型',
               chargingRate: 2
           },
           {
               name: '光能型',
               chargingRate: 3
           },
           {
               name: '永久型',
               chargingRate: 4
           }
       ];
    // 获得一个控制台实例，并在DOM上初始化。HTML结构如下：
    // rootEle
    //    div.universe
    //       div.planet
    //       div.spacecraft
    //       div.spacecraft
    //       ...
    //    div.panel
    //       div.spacecrafts-panel
    //          div.a-panel
    //              button 开始
    //              button 停止
    //              button 销毁 
    //          div.a-panel
    //       div.universe-panel

    // 这个类依赖spacecraftDOM类
    function commanderConsole(rootEle) {
        var $universe = $('<div>').addClass('universe'),
            $planet = $('<div>').addClass('planet'),

            $panel = $('<div>').addClass('panel');

        // 渲染宇宙、星球和控制面板的DOM（超无聊，没啥好看的）
        $universe
            .append($planet)
            .appendTo(rootEle)
            .after($panel);
            
        $panel
            .append($('<div>').addClass('spacecrafts-panel'))
            .append(
            $('<form>')
                .addClass('universe-panel')
                .append(engienTypeTemplate({types: engineType}))
                .append(energyTypeTemplate({types: energyType}))
                .append('<button data-type="dispatch" type="button">新飞船起飞</button>')
            );
            
        $(rootEle)
            .append($('<table>').addClass('status-table'));

        // 挂载实例属性
        this._rootEle = rootEle;
        this.universeEl = $universe[0];
        this.planetEl = $planet[0];
        // 实例化时直接先附送一个通信工具。一个控制台可以有多个通信工具（不过addMediator接口还没写）
        this.mediator = new BUS(this);
        this.spacecraftDOMs = [];

        var commander = null;

        Object.defineProperty(this, 'commander', {
            get: function() {
                return commander;
            },

            set: function(value) {
                if (!(value instanceof Commander)) throw new Error('这不是一个指挥官');

                commander = value;

                // 指挥官一旦就任，则面板的事件被绑定好，可以正常使用了
                // Console类不会主动登记指挥官。调用Commander实例的getConsole方法来使指挥官就任
                // 但这不是说是说Console类必须和Commander类共同使用（只是不这么做的话，UI界面失效而已）
                this._bindEvent();
            }
        });

    }

    var ccProto = commanderConsole.prototype;



    // 控制台为飞船新增一个面板
    ccProto.addSpacecraft = function(spacecraftId) {
        //新增面板
        $('.spacecrafts-panel', this._rootEle)
            .append(panelTemplate({
                id: spacecraftId
            }));

        // 新增飞船DOM
        var spacecraftDom = new spacecraftDOM(this, spacecraftId);
        $(this.universeEl).append(spacecraftDom.$el);
        this.spacecraftDOMs.push(spacecraftDom);

    };
    
    ccProto.findSpacecraftDom = function(id) {
        return _.find(this.spacecraftDOMs, function (dom) {
                return dom.spacecraft.id === id;
            });
    };
    // 移除一个飞船的面板
    ccProto.removeSpacecraft = function(spacecraftId) {
        var selector = '.a-panel[data-for="' + spacecraftId + '"]',
        
            spacecraftDom = this.findSpacecraftDom(spacecraftId),
            spacecraft = spacecraftDom.spacecraft,
            delay = spacecraft.getStatus().maxDelay;
            

        // 移除面板
        $(selector, this._rootEle)
            .remove();

        // 在延时delay后检查是否真的已经自毁。是的话则屏幕上不再显示
        // 否则仍然显示（但无法控制该飞船了）
        setTimeout((function() {
            if (!spacecraft.getStatus().isExisting) spacecraftDom.remove();
        }), delay);

    };

    // 用BUS发送广播
    ccProto.broadcast = function(commandObj) {
        // Adapter函数负责将一般的指令格式译成二进制格式字符串

        var binaryMessage = BUS.commandAdapter(commandObj);
        
        this.mediator.broadcast(binaryMessage);
    };
    
    ccProto.updateStatus = function(statusObj) {
        var id = parseInt(statusObj.id, 2);
        console.log(id);
        var row = $('.status-table-row[data-id="' + id + '"]', this._rootEle);
        
        if(row.length === 0 ) {
            var type = {},
                battery = this.findSpacecraftDom(id).spacecraft.getStatus().battery;
                
            type.energy = _.find(energyType, function(obj) {
                return obj.chargingRate === battery.chargingRate;
            }).name;
            
            type.engine = _.find(engineType, function(obj) {
                return obj.cusumeRate === battery.cusumeRate;
            }).name;
            
            
            $('.status-table', this._rootEle)
                .append($(tableRowTemplate({
                    status:_.defaults({id: id},statusObj),
                    type: type
                })).attr('data-id', id).addClass('status-table-row'));
            
        } else {
            row.children().eq(3).text(statusObj.status);
            row.children().eq(4).text(statusObj.battery + '%');
        }
    };

    // 为按钮绑定事件（当指挥官就任时）
    ccProto._bindEvent = function() {
        var $root = $(this._rootEle),
            that = this,
            methods = ['start', 'stop', 'destroy', 'dispatch'];

        methods.forEach(function(method) {
            var selector = '[data-type="' + method + '"]';
            $root.on('click', selector, function() {

                var id = Number(this.parentNode.dataset['for']),
                    spacecraftDom = _.find(that.spacecraftDOMs, function(dom) {
                        return dom.id === id;
                    });
                    
                // todo: 此处需要重构
                if(method === 'dispatch') {
                    var engineConfig = $('[name="engine-type"]:checked', that._rootEle).data(),
                        energyConfig = $('[name="energy-type"]:checked', that._rootEle).data(),
                        finalConfig = _.extend({
                            mediator: that.mediator
                        } ,engineConfig, energyConfig);
                     
                    that.commander.dispatchSpacecraft(finalConfig);
                } else {
                    // 指挥官下达相应命令
                    that.commander[method + 'Spacecraft'](id);
                }

                // 面板的相应反应
                switch (method) {
                    // 摧毁（可能实际上未成功）的同时移除控制台的飞船控制面板
                    // 因为还要移除控制面板，所以不能直接调用spacecraftDom.remove
                    case 'destroy':
                        that.removeSpacecraft(id);
                        break;
                    // 在面板屏幕上移动飞船
                    case 'start':
                        if (spacecraftDom.spacecraft.getStatus().isNavigating)
                            return;

                        var radius = $(that.planetEl).width() / 2, // 星球的半径
                            planetCo = $(that.planetEl).position(); // 星球的坐标

                        setTimeout(function() {
                            if (!spacecraftDom.spacecraft.getStatus().isNavigating) return;
                            // 飞船运动的半径在星球半径上有浮动
                            // move方法会判断此时飞船是否正在飞行。并不在飞行，则啥也不做就返回
                            spacecraftDom.move(radius + _.random(80, 150), {
                                x: planetCo.left + radius, // 圆心的横坐标
                                y: planetCo.top + radius // 圆心的纵坐标
                            });
                        }, spacecraftDom.spacecraft.getStatus().maxDelay);
                        break;
                    case 'stop':
                        setTimeout(function() {
                            if(!spacecraftDom.spacecraft.getStatus().isNavigating) {
                                spacecraftDom.stop();
                            }
                        },spacecraftDom.spacecraft.getStatus().maxDelay);
                        break;
                }
            });
        });

    };

    // 引入这个类是为了更好地管理DOM和飞船实例的对应关系
    // 这个类独立于整个系统之外
    // 除了管理控制台屏幕的飞船时应当使用它，其余地方一概不用
    function spacecraftDOM(console, spacecraftId) {


        this.id = spacecraftId;
        this.console = console;
        this.hasLaunched = false;

        // 找到DOM对应的飞船
        // 仍然只能通过控制台上登记的mediator来查找

        this.spacecraft = _.find(this.console.mediator.receviers, function(spacecraft) {
            return spacecraft.id === spacecraftId;
        });


        // 没找到就别继续了        
        if (!this.spacecraft) throw new Error('找不到这艘飞船');


        // 找到了，继续。添加DOM
        this.$el = $('<div>')
            .attr('data-id', spacecraftId)
            .addClass("spacecraft")
            .text(spacecraftId + '号')
            .append($('<span>').addClass('battery-status'));



        // 实时更新电池状态
        var battery = this.$el.find('.battery-status');
        this._update = setInterval((function updateBatteryRealtime() {
            var leftValue = this.spacecraft.getStatus().battery.leftValue;
            battery.text('-' + leftValue + '%');
        }).bind(this), 1000);

    }

    // 让这个DOM元素做绕行动画。接收半径和圆心坐标对象
    spacecraftDOM.prototype.move = function(radius, center) {


        var status,
            that = this;

        // 如果尚未发射完成，则使之进入轨道
        if (!this.hasLaunched) {
            // 若没有保存过运动参数
            if (!this._movingStatus) {
                // 新建并保存运动参数
                status = this._movingStatus = {};
                status.speed = this.spacecraft.getStatus().speed;
                status.r = radius; // 圆周运动半径
                status.w = status.speed / status.r; // 角速度
                status.centerX = center.x; // 圆心坐标x
                status.centerY = center.y; // 圆心坐标y
                status.num = _.random(0, 360); // 初始角度
            } else {
                status = this._movingStatus;
            }
            
            // 速度为0则不再做动画了
            if(this._movingStatus.speed === 0) return;

            // 确定圆周运动的起点
            var originPoint = getCoordinate(status),
                queueName = 'spacecraft' + that.spacecraft.id,
                nowX = this.$el.position().left,
                nowY = this.$el.position().top;

            // 发射至起点
            this.$el
                .css({
                    position: 'absolute',
                    left: nowX,
                    top: nowY
                })
                .animate(originPoint, {
                    
                    // 前往起点的用时 = 路程 / 速度
                    duration: (Math.sqrt(_.reduce(originPoint,function(pre,val) {
                        return val * val;
                    }), 0) - Math.sqrt(nowX * nowX + nowY * nowY)) / status.speed * 1000,
                    easing: 'linear',
                    complete: function() {
                        that.hasLaunched = true;
                        moving();
                    }
                });

        } else {
            status = this._movingStatus;
            moving();
        }

        // 开始做圆周运动
        function moving() {
            if(!that.spacecraft.getStatus().isNavigating) return; 
            
            var animationOption = {
                duration: 2 * Math.PI / status.w * 1000 / 360, // 每移动1度，用时 = 周期 / 360
                easing: 'linear',
                complete: moving
                
            };

            that.$el.animate(getCoordinate(status), animationOption);

            status.num++;

        }
        
        function getCoordinate(stutas) {
            return {
                top: status.centerY + Math.cos(status.num * Math.PI / 180) * status.r,
                left: status.centerX + Math.sin(status.num * Math.PI / 180) * status.r
            };
        }

    };

    spacecraftDOM.prototype.stop = function() {
        this.$el.stop();
    };


    spacecraftDOM.prototype.remove = function() {
        clearInterval(this._update);
        this.$el.remove();
    };

    window.commanderConsole = commanderConsole;

} (_, $));