module.exports = {
    kafka_host: 'kafkaserver:9092',
    kafka_topic: 'store-topic-2',

    webPort: 8082,
    simulatorPort: 8083,

    minimumOrderSize: 5,
    productionLines: 1,
    productionCapacityPerInterval: 2,
    maximumIntervalsToSchedule: 20
};
