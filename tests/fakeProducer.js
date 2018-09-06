module.exports = class FakeProducer {
    constructor() {
        this.messages = [];
    }

    publish(message) {
        if (Array.isArray(message)) {
            message.forEach(this.messages.push);
        }
        else {
            this.messages.push(message);
        }
    }
};
