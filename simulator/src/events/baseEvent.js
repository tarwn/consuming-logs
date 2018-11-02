module.exports = class BaseEvent {
    constructor(eventType) {
        this.$id = null;
        this.$type = eventType;
    }
};
