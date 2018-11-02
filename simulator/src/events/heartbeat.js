const BaseEvent = require('./baseEvent');

module.exports = class HeartbeatEvent extends BaseEvent {
    constructor(interval, date) {
        super('Heartbeat');
        this.interval = interval;
        this.date = date;
    }
};
