const levelup = require('levelup');
const leveldown = require('leveldown');
const encode = require('encoding-down');
const FinishedGood = require('./dtos/finishedGood');
const FinishedGoodBOM = require('./dtos/finishedGoodBOM');
const ProductionOrder = require('./dtos/productionOrder');
const SalesOrder = require('./dtos/salesOrder');
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

    // business logic

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

        return this.maximumProductionCapacity -
            scheduledProductionOrders.reduce(calculateUsedCapacity, 0) -
            unscheduledProductionOrders.reduce(calculateUsedCapacity, 0);
    }

    async placeSalesOrder(salesOrder) {
        salesOrder.assignNumber(`so-${this._seed}-${this._counter++}`);
        this._addOpenSalesOrder(salesOrder);
        const productionOrder = salesOrder.generateProductionOrder();
        this._addUnscheduledProductionOrder(productionOrder);
    }

    async planProductionOrder(prodOrder) {
        this._transferProductionOrder(prodOrder, 'Unscheduled', 'Scheduled');
    }

    // database access
    static _guardAgainstNull(order, field) {
        if (order[field] == null) {
            throw new Error(`Guard: ${field} cannot be null`);
        }
    }

    // - Sales Orders
    async _addOpenSalesOrder(order) {
        PersistentDatabase._guardAgainstNull(order, 'salesOrderNumber');
        await this._put(
            `SalesOrder:${order.salesOrderNumber}`,
            order,
            ['Index:SalesOrders:Open']
        );
    }

    async _getOpenSalesOrders() {
        return this._getAllByIndex(SalesOrder, 'Index:SalesOrders:Open');
    }

    // - Production Orders
    async _addScheduledProductionOrder(order) {
        PersistentDatabase._guardAgainstNull(order, 'productionOrderNumber');
        await this._put(
            `ProductionOrder:${order.productionOrderNumber}`,
            order,
            ['Index:ProductionOrders:Scheduled']
        );
    }

    async _getScheduledProductionOrders() {
        return this._getAllByIndex(ProductionOrder, 'Index:ProductionOrders:Scheduled');
    }

    async _addUnscheduledProductionOrder(order) {
        PersistentDatabase._guardAgainstNull(order, 'productionOrderNumber');
        await this._put(
            `ProductionOrder:${order.productionOrderNumber}`,
            order,
            ['Index:ProductionOrders:Unscheduled']
        );
    }

    async _getUnscheduledProductionOrders() {
        return this._getAllByIndex(ProductionOrder, 'Index:ProductionOrders:Unscheduled');
    }

    async _transferProductionOrder(order, currentState, newState) {
        PersistentDatabase._guardAgainstNull(order, 'productionOrderNumber');
        // remove old index and add new one in one shot
        const key = `ProductionOrder:${order.productionOrderNumber}`;
        await this._db.batch([
            { type: 'del', key: `Index:ProductionOrders:${currentState}:${key}` },
            { type: 'put', key: `Index:ProductionOrders:${newState}:${key}`, value: key }
        ]);
    }

    // db helpers
    async _get(objectType, key) {
        const raw = await this._db.get(key);
        return objectType.fromDB(raw);
    }

    async _getAllByIndex(objectType, indexName) {
        // search from index name prefix to < one character past
        const indexStart = `${indexName}:`;
        const indexEnd = `${indexName};`;

        const index = await new Promise((resolve, reject) => {
            const indexValues = [];
            this._db.createReadStream({
                gte: indexStart,
                lt: indexEnd,
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
        return Promise.all(index.map(key => this._get(objectType, key)));
    }

    async _put(key, value, indices) {
        const ops = [
            { type: 'put', key, value }
        ];
        (indices || []).forEach((i) => {
            ops.push({ type: 'put', key: `${i}:${key}`, value: key });
        });

        await this._db.batch(ops);
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
