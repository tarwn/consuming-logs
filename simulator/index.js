const config = require('../config');
const Simulator = require('./src/simulator');
const Producer = require('./src/kafka/producer');
const SystemEvent = require('./src/events/system');
// const { ConsumerGroup } = require('kafka-node');

console.log(`
============ Plant Simulation ================
Press Ctrl+C to exit.
==============================================

`);

const producer = new Producer(config);
producer.initialize()
    .then(() => {
        return producer.publish(new SystemEvent('starting', Date.now()));
    })
    .catch((err) => {
        console.log('Error initializing: ');
        console.log(err);
        process.exit(-2);
    });

const simulator = new Simulator(config, producer);
const timer = setInterval(() => simulator.runInterval(), 1000);

process.once('SIGINT', () => {
    clearInterval(timer);
    producer.publish(new SystemEvent('exiting', Date.now()))
        .then(() => {
            process.exit(0);
        })
        .catch(() => {
            process.exit(-1);
        });
});
