(function(_, $) {

    _.templateSettings = {
        interpolate: /\{\{(.+?)\}\}/g
    };

    var panelTemplate;

    $(function() {
        panelTemplate = _.template($('#spacecraft-panel-template').html());
    });


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
            $('<div>')
                .addClass('universe-panel')
                .append('<button data-type="dispatch">新飞船起飞</button>')
            );

        // 挂载实例属性
        this._rootEle = rootEle;
        this.universeEl = $universe[0];
        this.mediators = [new Mediator()];
        this.spacecraftDOM = [];

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
        this.spacecraftDOM.push(spacecraftDom);

    };

    // 移除一个飞船的面板
    ccProto.removeSpacecraft = function(spacecraftId) {
        var selector = '.a-panel[data-for="' + spacecraftId + '"]';

        // 移除面板
        $(selector, this._rootEle)
            .remove();

        // 1s后检查是否真的已经自毁。是的话则屏幕上不再显示
        // 否则仍然显示（但无法控制该飞船了）
        setTimeout((function() {
            this.spacecraftDOM.forEach(function(dom) {
                if(!dom.spacecraft.getStatus().isExisting)
                    dom.remove();
            });
        }).bind(this), 1000);

    };

    // 用mediator发送广播
    ccProto.broadcast = function(commandObj) {
        this.mediators.forEach(function(mediator) {
            mediator.broadcast(commandObj);
        });
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
                    spacecraftDom = _.find(that.spacecraftDOM,function(dom) {
                        return dom.id === id;
                    });

                that.commander[method + 'Spacecraft'](id);
                    
                switch(method) {
                // 摧毁（可能实际上未成功）的同时移除控制台的飞船控制面板
                // 因为还要移除控制面板，所以不能直接调用spacecraftDom.remove
                    case 'destroy':
                        that.removeSpacecraft(id);
                        break;
                    case 'start': 
                        spacecraftDom.move();
                        break;
                    case 'stop':
                        spacecraftDom.stop();
                        break;
                }
            });
        });

    };

    // 引入这个类是为了更好地管理DOM和飞船实例的对应关系
    // 这个类独立于整个系统之外
    // 除了管理控制台屏幕的飞船时应当使用它，其余地方一概不用
    function spacecraftDOM(console, spacecraftId) {

        this.spacecraft = null;
        this.id = spacecraftId;
        this.console = console;

        // 找到DOM对应的飞船
        // 仍然只能通过控制台上登记的mediator来查找
        var that = this;
        console.mediators.forEach(function(mediator) {

            that.spacecraft = this.spacecraft || _.find(mediator.receviers, function(spacecraft) {
                return spacecraft.id === spacecraftId;
            });

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

    // todo:让这个DOM元素做绕行动画
    spacecraftDOM.prototype.move = function() {
        var speed = this.spacecraft.getStatus().speed;
        
    };
    
    spacecraftDOM.prototype.stop = function() {
        
    };


    spacecraftDOM.prototype.remove = function() {
        clearInterval(this._update);
        this.$el.remove();
    };

    window.commanderConsole = commanderConsole;

} (_, $));