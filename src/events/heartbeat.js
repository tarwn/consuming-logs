const BaseEvent = require('./baseEvent');

module.exports = class HeartbeatEvent extends BaseEvent {
    constructor(date) {
        super('Heartbeat');
        this.date = date;
    }
};
