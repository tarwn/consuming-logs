module.exports = class FakeProducer {
    constructor() {
        this.messages = [];
    }

    publish(message) {
        if (Array.isArray(message)) {
            message.filter(f => f != null)
                .forEach(f => this.messages.push(f));
        }
        else if (message != null) {
            this.messages.push(message);
        }
    }
};
