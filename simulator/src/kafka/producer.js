const { KafkaClient, HighLevelProducer } = require('kafka-node');

module.exports = class Producer {
    constructor(config) {
        this._client = new KafkaClient({ kafkaHost: config.kafka_host });
        this._producer = null;

        this._topicName = config.kafka_topic;
        // waiting on node-kafka > 2.6.1: update manually via kafka manager
        // this._topic = { topic: config.kafka_topic, partitions: 2, replicationFactor: 2 }
        this._topic = config.kafka_topic;
    }

    initialize() {
        this._whenInitialized = Promise.resolve()
            .then(() => this._createTopics())
            .then(() => this._createProducer());

        return this._whenInitialized;
    }

    publish(events) {
        return this._whenInitialized
            .then(() => {
                if (Array.isArray(events)) {
                    return this._sendMessage(events);
                }
                else {
                    return this._sendMessage([events]);
                }
            });
    }

    dispose() {
        const disposalLogic = () => { /* nothing to do */ };
        const priorWork = this._whenInitialized || Promise.resolve();
        return priorWork.then(disposalLogic);
    }

    _createTopics() {
        return new Promise((resolve, reject) => {
            this._client.createTopics([this._topic], (error, result) => {
                if (error) {
                    console.log(`ERROR: ${JSON.stringify(error)}`);
                    console.log(`ERROR RESULT: ${JSON.stringify(result)}`);
                    reject(error);
                }
                else {
                    resolve();
                }
            });
        });
    }

    _createProducer() {
        return new Promise((resolve, reject) => {
            this._producer = new HighLevelProducer(this._client);
            this._producer.on('ready', () => {
                resolve();
            });

            this._producer.on('error', (err) => {
                console.err(err);
                reject(err);
            });
        });
    }

    _sendMessage(events) {
        return new Promise((resolve, reject) => {
            const messages = events.map(e => JSON.stringify(e));
            const payloads = [
                { topic: this._topicName, messages }
            ];
            this._producer.send(payloads, (err, data) => {
                if (!err) {
                    resolve();
                }
                else {
                    console.log(`ERROR: ${JSON.stringify(err)}`);
                    console.log(`ERROR DATA: ${JSON.stringify(data)}`);
                    reject(err);
                }
            });
        });
    }
};
