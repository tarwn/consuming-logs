module.exports = {
    kafka_host: 'kafkaserver:9092',
    kafka_topic: 'store-topic',

    webPort: 8082,

    minimumOrderSize: 5,
    productionLines: 1,
    productionCapacityPerInterval: 2,
    maximumIntervalsToSchedule: 20
};
