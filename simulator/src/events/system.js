const BaseEvent = require('./baseEvent');

module.exports = class SystemEvent extends BaseEvent {
    constructor(action, date) {
        super('System');
        this.action = action;
        this.date = date;
    }
};
