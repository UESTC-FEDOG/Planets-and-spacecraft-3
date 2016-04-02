// Commander类可以独立使用而不依赖Console类（尽管这会使它变得没有意义）
(function(_) {

    // 指挥官需要一个控制台
    function Commander() {
        this.knownSpacecraftCount = 0;
        this.console = null;
    }

    var proto = Commander.prototype;
    
    // 指挥官就任，获得一个控制台
    // 指挥官和控制台是一一对应的
    proto.getConsole = function(console) {
        
        if(!(console instanceof commanderConsole)) throw Error('这不是一个控制台');
        this.console = console;
        console.commander = this;
    };

    // 派出飞船
    proto.dispatchSpacecraft = function() {
        if (this.knownSpacecraftCount >= 4) {
            console.log('指挥官说“飞船数量太多了！”');
            return;
        }

        this.knownSpacecraftCount++;

        // 工厂制造飞船
        var spacecraft = spacecraftFactory({
                universe: this.console.universeEl,
                mediators: this.console.mediators,
                charging: true,
                speed: _.random(10, 30)
            });

        // 控制面板也要发生变动
        this.console.addSpacecraft(spacecraft.id);
        return this;
    };

    // 向全体发布命令
    proto.giveCommand = function(commandObj) {
        if(!this.console) throw new Error('指挥官没有控制台');
        this.console.broadcast(commandObj);
        return this;

    };
    
    // 指挥官启动、停止、摧毁一个飞船
    ['start', 'stop', 'destroy'].forEach(function(method) {
        proto[method + 'Spacecraft'] = function(spacecraftId, param) {
            var commandObj = {
                id: spacecraftId,
                command: method
            };
            
            if(!_.isUndefined(param)) commandObj[param] = param;
            
            this.giveCommand(commandObj);
            
            if(method === 'destroy') this.knownSpacecraftCount --;
            return this;
        };
    });

    
    window.Commander = Commander;
} (_));