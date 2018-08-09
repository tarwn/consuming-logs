import config from './config';
import Store from './store/store';
import Producer from './producer';
import { KafkaClient, HighLevelConsumer } from 'node-kafka';

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
const client = new KafkaClient({ kafkaHost: kafka_host });
const consumer = new HighLevelConsumer(client, [{ topic: kafka_topic }], {});
consumer.on('message', function (message) {
    console.log('LOG: ' + message);
});