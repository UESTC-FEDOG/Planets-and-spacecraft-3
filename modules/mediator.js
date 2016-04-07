(function(_) {
    function Mediator() {
        this.receviers = [];
    }

    Mediator.DELAY = 1000;

    var medpro = Mediator.prototype;

    medpro.add = function(spacecraft) {
        if (!(spacecraft instanceof Spacecraft)) throw Error('需要传入一个飞船实例');

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
    // 命令对象形如{
    //    id: 1,
    //    command: "gogogo",
    //    param: ['fast', 'east'] (可以是数组或非数组)
    // }
    // 时延1s，丢包率30%（均为硬编码）
    medpro.broadcast = function(commandObj) {
        this.receviers.forEach(function(recevier) {
            // 模拟丢包
            if (_.random(9) < 3) {
                console.log('给' + recevier.id + '的命令丢包了');
                return;
            }

            recevier._callbacks.forEach(function(callback) {
                setTimeout(callback.bind(null, commandObj), 1000);
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

    // 继承自Mediator
    function BUS(console) {
        Mediator.apply(this, arguments);
        this.console = console;
    }

    BUS.prototype = Object.create(Mediator.prototype, {
        'constructor': {
            value: BUS,
            writable: false
        }
    });


    // 检测一个指令格式是否合法
    BUS.isValidCommand = function(message) {
        return /^[01]{8}$/.test(message);
    };

    BUS.isValidStatusCode = function(statusCode) {
        return /^[01]{16}$/.test(statusCode);
    };

    // 命令转码器
    BUS.commandAdapter = function (commandObj) {
        var command = commandObj.command,
            id = commandObj.id;

        if (id > 16) throw Error('飞船编号大于16无法传送');
        if (!BUS.commandCodeList[command.toUpperCase()]) throw Error('没有这种指令:' + command);

        id = id.toString(2);
        command = BUS.commandCodeList[command.toUpperCase()].toString(2);

        function padStartWith0(str, length) {
            while (str.length < length) {
                str = '0' + str;
            }
            return str;
        }

        return padStartWith0(id, 4) + padStartWith0(command, 4);


    };
    
    BUS.statusCodeAdapter = function(binaryMessage) {
        var id = binaryMessage.slice(0, 4),
            battery = parseInt(binaryMessage.slice(-8), 2),
            status;
            
            
        switch(binaryMessage.substr(4,4)) {
            case '0010':
                status = '停止中';
                break;
            case '0001':
                status = '飞行中';
                break;
            case '1100':
                status = '摧毁中';
                break;
            default:
                status = '未知状态';
        }
        
        return {
            id: id,
            battery: battery,
            status: status
        };
    };
    

    BUS.commandCodeList = {};
    BUS.commandCodeList.START = 1;
    BUS.commandCodeList.STOP = 2;
    BUS.commandCodeList.DESTROY = 12;

    BUS.DELAY = 300;

    // 用于BUS与飞船的通信
    BUS.prototype.broadcast = function(binaryMessage) {
        console.log(binaryMessage);
        if (BUS.isValidCommand(binaryMessage)) {
            console.log('向全体发送指令：' + binaryMessage);

            this.receviers.forEach(function send(recevier) {
                // 模拟丢包
                if (_.random(9) < 1) {
                    console.log('给' + recevier.id + '的命令丢包了。重试中');
                    send(recevier);
                    return;
                }
                recevier._callbacks.forEach(function(callback) {
                    setTimeout(callback.bind(null, binaryMessage), BUS.DELAY);
                });
            });
            
        } else if(BUS.isValidStatusCode(binaryMessage)) {
            console.log('收到报告');
            this.console.updateStatus(BUS.statusCodeAdapter(binaryMessage));
            
        } else {
            throw Error('命令格式错误');
        }
    };



    window.BUS = BUS;

} (_));
