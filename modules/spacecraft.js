(function(_) {
    var spacecraftFactory,
        Spacecraft,
        scpro,
        // 默认配置对象
        defaultConfig = {
            // 以下是getStatus方法暴露出的信息
            isExisting: true,
            battery: {
                leftValue: 100,
                cusumeRate: 0,
                chargingRate: 0,
                isCharging: false
            },
            speed: 0,
            isNavigating: false,
            // 取决于一个飞船实例接入的中介对象的最大时延
            maxDelay: Infinity,

            // 以下是不希望getStatus方法暴露出的飞船状态信息（变量名第一个字符为_）
            _engine: null
        },
        // 可以供外界工厂配置的属性
        configableProp = ['speed',  'mediators', 'chargingRate', 'cusumeRate'];

    // 飞船构造函数
    Spacecraft = function Spacecraft() {
        // _config用于类内部使用
        this._config = _.clone(defaultConfig);
        // 确保每个实例的battery对象引用的不是同一个
        this._config.battery = _.clone(defaultConfig.battery);
        this._callbacks = [];
        this.mediators = [];
        this.id = null;
    };
   
    scpro = Spacecraft.prototype;

    // 飞船工厂。配置对象如下：
    // {
    //      cusumeRate: 数字
    //      chargingRate: 数字
    //      speed: 数字,
    //      mediators: 数组或多个对象。数组成员或多个对象都必须是Mediator或其派生类 
    // }

    spacecraftFactory = function(config) {
        config = Object(config);
        var spacecraft = new Spacecraft();
        
        spacecraft._config = _.chain(config)
                                .pick(_.keys(defaultConfig))
                                .defaults(spacecraft._config)
                                .value();
        

        spacecraft._config.battery = _.chain(config)
                                        .pick(['chargingRate', 'cusumeRate'])
                                        .defaults(spacecraft._config.battery)
                                        .value();

        // 获得一个唯一ID
        spacecraft.id = Number(_.uniqueId());

        // 连上mediators
        spacecraft.connectToMediators(config.mediators);
        if (spacecraft.mediators.length > 0) {
            spacecraft._config.maxDelay = _.max(spacecraft.mediators, function(mediator) {
                return mediator.constructor.DELAY;
            }).constructor.DELAY;
            
        }

        // 使得可以Madiator的广播来调用该飞船的方法
        spacecraft.oncommandReceived(function(commandObj) {
            if (_.isFunction(this[commandObj.command])) {
                var param;

                if (!_.isArray(commandObj.param)) param = [commandObj.param];
                else param = commandObj.param;

                this[commandObj.command].apply(this, param);
            }
        });

        // 有需要的话，这艘飞船每次启动都会开始充电

        return spacecraft;
    };

    // 充电功能。
    scpro.charge = function() {
        if (this._config.battery.isCharging) return this;
        var chargingRate = this._config.battery.chargingRate;
        console.log(this.id + '号开始充电，充电速率' + chargingRate);

        var charge = function() {
            var leftValue = this.getStatus().battery.leftValue;
            // 如果马上就要充完
            if (leftValue >= 100 || leftValue + chargingRate >= 100) {
                clearInterval(charging);
                this._config.battery.isCharging = false;
                this._config.battery.leftValue = 100;
                console.log(this.id + '号充电完成');
                return;
            }

            // 一次充电
            this._config.battery.isCharging = true;
            this._config.battery.leftValue += chargingRate;

            // 若超过了100则置为100
            if (this._config.battery.leftValue >= 100)
                this._config.battery.leftValue = 100;
        };

        var charging = setInterval(charge.bind(this), 1000);
        return this;
    };


    //飞船启动。接收一个飞行速度speed作为参数
    scpro.start = function(speed) {
        if (this.getStatus().battery.leftValue <= 0) return false;
        if (this.getStatus().isNavigating) return false;

        this._config.isNavigating = true;
        this._config.speed = _.isNumber(speed) && speed > 0 ? speed : this._config.speed;

        // 启动后开始耗电
        var consumeBattery = function() {
            var battery = this.getStatus().battery;
            if (battery.leftValue - battery.cusumeRate <= 0) {
                console.log(this.id + '号飞船停电');

                // 停止后不会自动启动
                this.stop();
                return;
            } else {
                this._config.battery.leftValue -= battery.cusumeRate;
                return;
            }
        };
        this._config._engine = setInterval(consumeBattery.bind(this), 1000);

        console.log(this.id + '号飞船启动，速率' + this._config.speed);
        // 一启动就开始充电
        this.charge();

        return this;
    };

    // 飞船停止
    scpro.stop = function() {
        this._config.isNavigating = false;
        // 停止耗电
        clearInterval(this._config._engine);
        console.log(this.id + '号飞船停止');
        return this;
    };

    // 和中介对象连接
    scpro.connectToMediators = function(mediators) {
        if (!_.isArray(mediators)) mediators = _.toArray(arguments);



        _.each(mediators, function(mediator) {
            if (!(mediator instanceof Mediator)) {
                throw Error(this.id + '号飞船尝试连接中介但未成功：' + mediator + '不是一个中介对象');
            }

            if (!mediator.has(this)) mediator.add(this);
        }, this);

        this.mediators = this.mediators.concat(mediators);
        console.log(this.id + '号飞船成功和所有中介对接');
        return this;
    };


    // 添加收到任何指令后的回调(几乎没什么用，一般用下一个方法)
    scpro.addListener = function(callback) {
        function adapter(binaryMessage) {
            console.log(this.id + '号飞船开始解析');
            if (!BUS.isValid) throw Error('接收到的信息格式不对');

            var id = parseInt(binaryMessage.slice(0, 4), 2),
                command = parseInt(binaryMessage.slice(4), 2);


            command = _.findKey(BUS.commandCodeList, function(val) {
                return val === command;
            });

            if (!command) throw Error('飞船解析命令时出错：没有这种命令');

            return {
                id: id,
                command: command.toLowerCase()
            };
        }

        this._callbacks.push(_.compose(callback.bind(this), adapter.bind(this)));
        return this;
    };

    // 添加收到给该飞船的指令后的回调
    scpro.oncommandReceived = function(callback) {
        this.addListener(function(commandObj) {
            if (commandObj.id === this.id) {
                callback.call(this, _.omit(commandObj, 'id'));
            }
        });
    };

    // 获得表示当前飞船状态的对象
    scpro.getStatus = function() {
        return _.chain(this._config).pick(function(val, key) {
            // 获取非“_”开头的属性
            return key[0] !== '_';
        }).mapObject(function(val, key) {
            // 对于值是引用对象的属性，复制一份
            if (_.isObject(val)) return _.clone(val);
            return val;
        }).value();
    };

    // 让每个Mediator移除自己
    // 如果飞船没被其它地方引用则会使得垃圾回收机制会起作用
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

