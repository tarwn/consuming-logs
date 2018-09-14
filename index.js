const config = require('./config');
const Simulator = require('./src/simulator');
const Producer = require('./src/kafka/producer');
const Web = require('./src/web');
const { ConsumerGroup } = require('kafka-node');

console.log(`
============ Plant Simulation ================
Press Ctrl+C to exit.
==============================================

`);

const producer = new Producer(config);
producer.initialize()
    .then(() => {
        return producer.publish({ type: 'system', action: 'starting', time: Date.now() });
    })
    .catch((err) => {
        console.log('Error initializing: ');
        console.log(err);
        process.exit(-2);
    });

const simulator = new Simulator(config, producer);
const timer = setInterval(() => simulator.runInterval(), 1000);

const web = new Web(config);
web.start()
    .then(() => {
        console.log(`Web console started on http://localhost:${config.webPort}`);
    });

process.once('SIGINT', () => {
    clearInterval(timer);
    producer.publish({ type: 'system', action: 'exiting', time: Date.now() })
        .then(() => {
            process.exit(0);
        })
        .catch(() => {
            process.exit(-1);
        });
});

// log events to console
const options = {
    kafkaHost: config.kafka_host,
    fromOffset: 'earliest',
    groupId: 'publisher-log-group'
};
const consumer = new ConsumerGroup(options, [config.kafka_topic]);
consumer.on('message', (message) => {
    // console.log(`LOG: ${JSON.stringify(message)}`);
    web.publishEvents(message);
});
consumer.on('error', (error) => {
    console.log(`Error: ${JSON.stringify(error)}`);
});
