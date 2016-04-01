(function(_) {
    function Mediator() {
        this.receviers = [];
    }

    var medpro = Mediator.prototype;

    medpro.add = function(spacecraft) {
        if(!(spacecraft instanceof Spacecraft)) throw Error('需要传入一个飞船实例');
            
        this.receviers.push(spacecraft);
        return this;
    };

    // 根据实例或飞船ID移除一个监听者
    medpro.remove = function(spacecraft) {
        var index = _.findIndex(this.receviers, function(recevier) {
            return recevier === spacecraft || recevier.id === spacecraft;
        });
        
        this.receviers.splice(index, 1);
        return this;
    };

    // 向所有监听者广播一个事件，回调函数会收到一个命令对象
    // 时延1s，丢包率30%（均为硬编码）
    medpro.broadcast = function(type, command) {
        this.receviers.forEach(function(recevier) {
            if(!recevier._events[type]) return;
            // 模拟丢包
            if(_.random(9) < 3) return;
            
            recevier._events[type].forEach(function(callback) {
                setTimeout(callback.bind(null, command), 1000);
            });
        });
        
        return this;
    };


    // 根据ID或实例对象，判断某飞船是否在监听这个中介
    medpro.has = function(spacecraft) {
        return this.receviers.some(function(recevier) {
            return recevier.id === spacecraft || recevier === spacecraft;
        });
    };

    window.Mediator = Mediator;

} (_));