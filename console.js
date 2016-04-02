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
    function commanderConsole(rootEle) {
        var $universe = $('<div>').addClass('universe'),
            $planet = $('<div>').addClass('planet'),

            $panel = $('<div>').addClass('panel');

        // 渲染宇宙、星球和控制面板
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
        this.spacecrafts = [];
        this.mediators = [new Mediator()];

        var commander = null;

        Object.defineProperty(this, 'commander', {
            get: function() {
                return commander;
            },

            set: function(value) {
                if (!(value instanceof Commander)) throw new Error('这不是一个指挥官');

                commander = value;
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

        $('<div>')
            .attr('data-id', spacecraftId)
            .addClass("spacecraft")
            .appendTo(this.universeEl);

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
            var stillIn = this.mediators.some(function(mediator) {
                return mediator.receviers.some(function(spacecraft) {
                    console.log(spacecraft.id === spacecraftId);
                    return spacecraft.id === spacecraftId;
                });
            });
            console.log(stillIn);
            if (stillIn) {
                return;
            }
            $('.spacecraft[data-id="' + spacecraftId + '"]', this.universeEl)
                .remove();
        }).bind(this), 1000);

    };

    // 为按钮绑定事件

    ccProto._bindEvent = function() {
        var $root = $(this._rootEle),
            that = this,
            methods = ['start', 'stop', 'destroy', 'dispatch'];

        methods.forEach(function(method) {
            var selector = '[data-type="' + method + '"]';
            $root.on('click', selector, function() {
                var id = Number(this.parentNode.dataset['for']);

                that.commander[method + 'Spacecraft'](id);

                // 摧毁（可能实际上未成功）的同时移除控制台的飞船控制面板
                if (method === 'destroy') that.removeSpacecraft(id);
            });
        });

    };

    window.commanderConsole = commanderConsole;

} (_, $));