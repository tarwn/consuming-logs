export default class EventStore {
    constructor() {
        this.log = [];
        this.debug = true;
    }

    addEvents(events) {
        if (events != null) {
            events.forEach((e) => {
                this.log.push(JSON.stringify(e));
                this.publish(e);
            });
        }
    }

    publish(event) {
        if (this.debug) {
            console.log({ event });
        }
    }
}
