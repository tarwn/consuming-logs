const levelup = require('levelup');
const leveldown = require('leveldown');
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
        this._db = levelup(leveldown(`./db/${simulatorConfig.kafka_topic}`));

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

    // raw database access

    // note to self: straight get/set is a poor idea for index
    //  - instead make them individual entries and use createReadStream
    //  when you need the whole set, or individual put/del calls by
    //  convention to add/clear them  (inside a batch call for atomicity)

    async _addScheduledProductionOrder(order) {
        // todo, replace this, super dangerous
        const currentIndex = await PersistentDatabase._indexOrEmpty(async () => {
            const keys = await this._db.get('Index:ProductionOrders:Scheduled');
            return keys.map(async key => this._db.get(key));
        });

        currentIndex.push(`ProductionOrder:${order.productionOrderNumber}`);
        await this._db.batch([
            { type: 'put', key: `ProductionOrder:${order.productionOrderNumber}`, value: order },
            { type: 'put', key: 'Index:ProductionOrders:Scheduled', value: currentIndex }
        ]);

        // better
        // await this._db.batch([
        //     { type: 'put', key: `ProductionOrder:${order.productionOrderNumber}`, value: order },
        //     { type: 'put', key: `'Index:ProductionOrders:Scheduled:${order.productionOrderNumber}'`, value: 'true' }
        // ]);
    }

    async _getScheduledProductionOrders() {
        return PersistentDatabase._indexOrEmpty(async () => {
            const keys = await this._db.get('Index:ProductionOrders:Scheduled');
            return keys.map(async key => this._db.get(key));
        });
    }

    async _addUnscheduledProductionOrder(order) {
        this._noop = order;
    }

    async _getUnscheduledProductionOrders() {
        return PersistentDatabase._indexOrEmpty(async () => {
            const keys = await this._db.get('Index:ProductionOrders:Unscheduled');
            return keys.map(async key => this._db.get(key));
        });
    }

    // helpers
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
