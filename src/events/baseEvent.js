module.exports = class BaseEvent {
    constructor(eventType) {
        this.$type = eventType;
    }
};
