(function(_) {
    var spacecraftFactory,
        defaultConfig,
        Spacecraft,
        scpro;


    // 默认配置对象
    defaultConfig = {
        isExisting: true,
        battery: {
            leftValue: 100,
            cusumeRate: 5,
            chargingRate: 3,
            isCharging: false
        },
        speed: 0,
        isNavigating: false,

        // 以下是不希望暴露出的飞船状态信息（变量名第一个字符为_）
        _engine: null

    };
    
    // 飞船构造函数
    Spacecraft = function Spacecraft() {
        this._config = _.extend({}, defaultConfig);
        this._events = {};
        this.mediators = [];
        this.id = null;
        this.universe = null;
    };

    scpro = Spacecraft.prototype;

    // 飞船工厂
    spacecraftFactory = function(config) {
        var spacecraft = new Spacecraft(),
            lastConfig = _.defaults(
                _.pick(Object(config), ['battery', 'speed', 'universe', 'charging', 'mediators']),  // config对象的属性仅限这些。charging可以是数字
                defaultConfig);

        lastConfig.battery = _.defaults(lastConfig.battery, defaultConfig.battery);

        spacecraft._config = _.pick(lastConfig, _.keys(defaultConfig));

        spacecraft.universe = _.isElement(lastConfig.universe) ? lastConfig.universe : null;

        // 获得一个唯一ID
        spacecraft.id = _.uniqueId();

        // 连上mediators
        spacecraft.connectToMediators(lastConfig.mediators);

        // 绑定对自毁命令的响应
        spacecraft.oncommanded('destroy', function() {
            this.destroy();
        });

        // 有需要的话，开始就充电
        if (_.isNumber(lastConfig.charging) && lastConfig.charging > 0 || lastConfig.charging === true)
            spacecraft.start = _.partial(spacecraft.start, _, lastConfig.charging);

        return spacecraft;
    };

    // 充电功能。每秒充电chargingRate个点
    scpro.charge = function(chargingRate) {
        if (this._config.battery.isCharging) return this;

        if (_.isNumber(chargingRate)) {
            this._config.battery.chargingRate = chargingRate;
        } else {
            chargingRate = this._config.battery.chargingRate;
        }

        var charge = function() {
            if (this.getStatus().battery.leftValue >= 100) {
                clearInterval(charging);
                this._config.battery.isCharging = false;
                console.log('充电完成');
                return;
            }

            this._config.battery.isCharging = true;
            this._config.battery.leftValue += chargingRate;
        };

        var charging = setInterval(charge.bind(this), 1000);
        return this;
    };


    //飞船启动。接收一个飞行速度speed作为参数
    scpro.start = function(speed, charging) {
        if (this.getStatus().battery.leftValue <= 0) return false;

        this._config.isNavigating = true;
        this._config.speed = _.isNumber(speed) && speed > 0 ? speed : this._config.speed;

        // 启动后开始耗电
        var consumeBattery = function() {
            var battery = this.getStatus().battery;
            if (battery.leftValue - battery.cusumeRate <= 0) {
                console.log('no power');

                // 停止后不会自动启动
                this.stop();
                return;
            } else {
                this._config.battery.leftValue -= battery.cusumeRate;
                console.log('电量' + battery.leftValue);
                return;
            }
        };
        this._config._engine = setInterval(consumeBattery.bind(this), 1000);

        console.log('飞船启动');
        // 有需要充电的话，开始充电
        if (charging) this.charge(_.isNumber(charging) ? charging : void 0);

        return this;
    };

    // 飞船停止
    scpro.stop = function() {
        this._config.isNavigating = false;
        // 停止耗电
        clearInterval(this._config._engine);
        console.log('飞船停止');
        return this;
    };

    // 和中介对象连接
    scpro.connectToMediators = function(mediators) {
        if (!_.isArray(mediators)) mediators = _.toArray(arguments);

        if (!mediators.every(function(ele) { return ele instanceof Mediator; })) {
            console.log('尝试连接但未成功');
            return this;
        }

        this.mediators = this.mediators.concat(mediators);

        _.each(mediators, function(mediator) {
            if (!mediator.has(this)) mediator.add(this);
        }, this);

        console.log('成功和所有中介对接');
        return this;
    };

    // 事件订阅。this指向飞船实例
    scpro.on = function(event, callback) {
        var eventsList = this._events;

        if (eventsList[event]) {
            eventsList[event].push(callback.bind(this));
        } else {
            (eventsList[event] = []).push(callback.bind(this));
        }

        return this;
    };

    // 快捷方式。添加收到针对自己的指令后的回调
    scpro.oncommanded = function(command, callback) {
        this.on('command', function(command) {
            if (command.id === this.id) callback.call(this, command.command);
        });
    };

    // 获得表示当前飞船状态的对象
    scpro.getStatus = function() {
        return _.chain(this._config).pick(function(val, key) {
            return key[0] !== '_';
        }).mapObject(function(val, key) {
            if (_.isObject(val)) return _.extend({}, val);
            return val;
        }).value();
    };

    // 让指挥中心移除自己
    scpro.destroy = function() {
        _.each(this.mediators, function(mediator) {
            mediator.remove(this);
        }, this);

        this._config.isExisting = false;
        return null;
    };

    window.spacecraftFactory = spacecraftFactory;
    window.Spacecraft = Spacecraft;

} (_));