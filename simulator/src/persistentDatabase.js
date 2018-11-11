const levelup = require('levelup');
const leveldown = require('leveldown');
const encode = require('encoding-down');
const FinishedGood = require('./dtos/finishedGood');
const FinishedGoodBOM = require('./dtos/finishedGoodBOM');
const RawPart = require('./dtos/rawPart');


module.exports = class PersistentDatabase {
    constructor(plantConfig, simulatorConfig) {
        if (!plantConfig.isValid) {
            throw new Error(`Configuration is not valid: ${plantConfig.validationErrors.join(',')}`);
        }

        this._plantConfig = plantConfig;
        this._simulatorConfig = simulatorConfig;
        this._db = levelup(encode(leveldown(`./db/${simulatorConfig.kafka_topic}`), { valueEncoding: 'json' }));

        this.cash = plantConfig.cash || 0;
        this.version = '';

        this._seed = `${Math.floor(Math.random() * 10000)}-`;
        this._counter = 0;
    }

    async initialize() {
        // is this a continue or new execution?
        //  if continue, does the config match or should it be a new start?

        let operations = [
            {
                type: 'put',
                key: 'plantConfig',
                value: this._plantConfig
            }
        ];

        operations = operations.concat(this._plantConfig.productCatalog.map((product) => {
            return {
                type: 'put',
                key: `ProductCatalog:${product.partNumber}`,
                value: new FinishedGood(
                    product.partNumber,
                    product.name,
                    new FinishedGoodBOM(product.bom),
                    product.unitPrice
                )
            };
        }));

        operations = operations.concat(this._plantConfig.partsCatalog.map((part) => {
            return {
                type: 'put',
                key: `PartCatalog:${part.partNumber}`,
                value: new RawPart(
                    part.partNumber,
                    part.unitPrice
                )
            };
        }));

        await this._db.batch(operations);
    }

    toStatusString() {
        return {
            todo: 'see centralDatabase.js',
            noop: this._noop
        };
    }

    // todo: abstract business logic from raw persistence?

    get maximumProductionCapacity() {
        return this._plantConfig.productionLines *
            this._plantConfig.productionCapacityPerInterval *
            this._plantConfig.maximumIntervalsToSchedule;
    }

    async getAvailableProductionScheduleCapacity() {
        const calculateUsedCapacity = (total, productionOrder) => {
            return total + (productionOrder.orderQuantity - productionOrder.completedQuantity);
        };

        const scheduledProductionOrders = await this._getScheduledProductionOrders();
        const unscheduledProductionOrders = await this._getUnscheduledProductionOrders();

        // console.log({
        //     capacity: this.maximumProductionCapacity,
        //     scheduled: scheduledProductionOrders.reduce(calculateUsedCapacity, 0),
        //     unscheduled: unscheduledProductionOrders.reduce(calculateUsedCapacity, 0)
        // });

        return this.maximumProductionCapacity -
            scheduledProductionOrders.reduce(calculateUsedCapacity, 0) -
            unscheduledProductionOrders.reduce(calculateUsedCapacity, 0);
    }

    // database access

    async _addScheduledProductionOrder(order) {
        await this._db.batch([
            { type: 'put', key: `ProductionOrder:${order.productionOrderNumber}`, value: order },
            { type: 'put', key: `Index:ProductionOrders:Scheduled:${order.productionOrderNumber}`, value: `ProductionOrder:${order.productionOrderNumber}` }
        ]);
    }

    async _getScheduledProductionOrders() {
        return this._getIndexedValues('Index:ProductionOrders:Scheduled:');
    }

    async _addUnscheduledProductionOrder(order) {
        await this._db.batch([
            { type: 'put', key: `ProductionOrder:${order.productionOrderNumber}`, value: order },
            { type: 'put', key: `Index:ProductionOrders:Unscheduled:${order.productionOrderNumber}`, value: `ProductionOrder:${order.productionOrderNumber}` }
        ]);
    }

    async _getUnscheduledProductionOrders() {
        return this._getIndexedValues('Index:ProductionOrders:Unscheduled:');
    }

    // helpers
    async _getIndexedValues(indexPrefix) {
        // search from indexPrefix to < one character past indexPrefix
        const indexPrefixEnd = indexPrefix.slice(0, -1) +
            String.fromCharCode(indexPrefix.slice(-1).charCodeAt(0) + 1);

        const index = await new Promise((resolve, reject) => {
            const indexValues = [];
            this._db.createReadStream({
                gte: indexPrefix,
                lt: indexPrefixEnd,
                keys: true,
                values: true
            })
                .on('data', (data) => {
                    indexValues.push(data.value);
                })
                .on('error', (error) => {
                    reject(error);
                })
                .on('close', () => { })
                .on('end', () => {
                    resolve(indexValues);
                });
        });
        return Promise.all(index.map(key => this._db.get(key)));
    }

    static async _indexOrEmpty(func) {
        try {
            return await func();
        }
        catch (e) {
            if (e.notFound) {
                return [];
            }
            else {
                throw e;
            }
        }
    }
};
