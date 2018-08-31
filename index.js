const config  = require('./config');
const Store = require('./store/store');
const Producer = require('./producer');
const ConsumerGroup = require('kafka-node').ConsumerGroup;

const producer = new Producer(config);
producer.initialize()
    .then(() => {
        return producer.publish({ type: 'system', action: 'starting', time: Date.now() });
    })
    .catch((err) => { 
        console.log("Error initializing: ");
        console.log(err);
        process.exit(-2);
    });

const store = new Store(config, producer);
const timer = setInterval(() => store.runInterval(), 1000);

process.once('SIGINT', () => {
    //clearInterval(timer);
    producer.publish({ type: 'system', action: 'exiting', time: Date.now() })
        .then(() => {
            process.exit(0);
         })
        .catch((e) => { 
            process.exit(-1);
        })
});
  

// log events to console
const options = {
    kafkaHost: config.kafka_host,
    fromOffset: 'earliest',
    groupId: 'publisher-log-group'
};
const consumer = new ConsumerGroup(options, [config.kafka_topic ]);
consumer.on('message', function (message) {
    console.log('LOG: ' + JSON.stringify(message));
});
consumer.on('error', function (error) {
    console.log('Error: ' + JSON.stringify(error));
});
