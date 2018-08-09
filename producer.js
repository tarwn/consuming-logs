const kafka = require('kafka-node');
const KafkaClient = kafka.KafkaClient;
const HighLevelConsumer = kafka.HighLevelConsumer;

module.exports = class Producer {
    constructor(config) {
        this.client = new KafkaClient({ kafkaHost: config.kafka_host });
        this.producer = null;
        this.topic = { topic: config.kafka_topic, partitions: 2, replicationFactor: 2 }
    }

    initialize() {
        return Promise.resolve()
            .then(() => this._createTopics())
            .then(() => this._createProducer());
    }

    publish(message) {
        return new Promise((resolve, reject) => {
            if (this.producer == null) {
                reject(new Error('Producer is not initialized'));
            }

            const payloads = [
                { topic: this.topic.topic, message: [JSON.stringify(message)] }
            ];
            this.producer.send(payloads, (err, data) => {
                if (!err) {
                    resolve();
                }
                else {
                    reject(err);
                }
            });
        });
    }

    dispose() {
        return Promise.resolve();
    }

    _createTopics() {
        return new Promise((resolve, reject) => { 
            this.client.createTopics((error, result) => { 
                if (error) {
                    reject(result);
                }
                else {
                    resolve();
                }
            })
        });
    }

    _createProducer() {
        return new Promise((resolve, reject) => {
            this.producer = new kafka.HighLevelProducer(this.client);
            this.producer.on('ready', () => {
                resolve();
            });

            this.producer.on('error', (err) => {
                console.log('Producer: ' + err);
            });
        });
    }
}
