module.exports = class Store {
    constructor(config, database, publisher) {
        this._database = database;
        this._publisher = publisher;
    }

    runInterval() {
        return Promise.resolve()
            .then(() => this._runInterval());
    }

    _runInterval() {
        return this._publisher.publish({ type: 'heartbeat', action: 'alive', date: Date.now() });
    }
}