const config  = require('./config');
const Store = require('./store/store');
const Producer = require('./producer');
const kafka = require('kafka-node');
const KafkaClient = kafka.KafkaClient;
const ConsumerGroup = kafka.ConsumerGroup;

const producer = new Producer(config);
producer.initialize();
producer.publish({ type: 'system', action: 'starting', time: Date.now() });

const database = {
    getInventory: (productId) => { },
    adjustInventory: (productId, adjustmentAmount) => { }
};

const store = new Store(config, database, producer);
const timer = setInterval(() => store.runInterval(), 1000);

process.once('SIGINT', () => {
    producer.publish({ type: 'system', action: 'exiting', time: Date.now() });
});
  

// log events to console
const options = {
    kafkaHost: config.kafka_host,
    fromOffset: 'earliest'
};
const consumer = new ConsumerGroup(options, [config.kafka_topic ]);
consumer.on('message', function (message) {
    console.log('LOG: ' + message);
});
