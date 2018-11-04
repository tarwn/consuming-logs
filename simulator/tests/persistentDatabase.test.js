const PersistentDatabase = require('../src/persistentDatabase');
const ProductionOrder = require('../src/dtos/productionOrder');
const PlantConfig = require('../src/plantConfig');
const SalesOrder = require('../src/dtos/salesOrder');
const rimraf = require('rimraf');

const KAFKA_TOPIC = 'unit-test-topic';

function getPlantConfig(data) {
    const defaults = data || {};
    return new PlantConfig({
        productionCapacityPerInterval: defaults.productionCapacityPerInterval || 10,
        productionLines: defaults.productionLines || 1,
        maximumIntervalsToSchedule: 20
    });
}

const cleanupList = [];

function getSimulatorConfig() {
    // generating topics is attempting to workaround parallel execution from wallaby
    //  without sacrificing it and switching to (slow) sequential execution
    const x = `${KAFKA_TOPIC}-${Math.floor(Math.random() * 10000)}`;
    cleanupList.push(x);
    return {
        kafka_topic: x
    };
}

afterEach(() => {
    cleanupList.forEach((topic) => {
        rimraf.sync(`../src/db/${topic}`);
    });
});

describe('available production schedule', () => {
    test('nothing scheduled or unscheduled: all capacity available', async () => {
        const db = new PersistentDatabase(getPlantConfig({
            productionCapacityPerInterval: 10,
            productionLines: 1
        }), getSimulatorConfig());

        const availableCapacity = await db.getAvailableProductionScheduleCapacity();

        expect(availableCapacity).toBe(db.maximumProductionCapacity);
    });

    test('half scheduled , no unscheduled: half capacity available', async () => {
        const db = new PersistentDatabase(getPlantConfig({
            productionCapacityPerInterval: 10,
            productionLines: 1
        }), getSimulatorConfig());
        await db._addScheduledProductionOrder(new ProductionOrder('unit-test-1', 'unit-test-1', db.maximumProductionCapacity / 2));

        const availableCapacity = await db.getAvailableProductionScheduleCapacity();

        expect(availableCapacity).toBe(db.maximumProductionCapacity / 2);
    });

    test('some scheduled , some unscheduled: remaining capacity available', async () => {
        const db = new PersistentDatabase(getPlantConfig({
            productionCapacityPerInterval: 10,
            productionLines: 1
        }), getSimulatorConfig());
        await db._addScheduledProductionOrder(new ProductionOrder('unit-test-1', 'unit-test-1', 2));
        await db._addUnscheduledProductionOrder(new ProductionOrder('unit-test-1', 'unit-test-1', 2));

        const availableCapacity = await db.getAvailableProductionScheduleCapacity();

        expect(availableCapacity).toBe(db.maximumProductionCapacity - 4);
    });

    test('no scheduled, half unscheduled: half capacity available', async () => {
        const db = new PersistentDatabase(getPlantConfig({
            productionCapacityPerInterval: 10,
            productionLines: 1
        }), getSimulatorConfig());
        await db._addUnscheduledProductionOrder(new ProductionOrder('unit-test-1', 'unit-test-1', db.maximumProductionCapacity / 2));

        const availableCapacity = await db.getAvailableProductionScheduleCapacity();

        expect(availableCapacity).toBe(db.maximumProductionCapacity / 2);
    });
});

describe('placeSalesOrder', () => {
    test('new salesOrder is assigned a Sales Order Number', () => {
        const db = new PersistentDatabase(getPlantConfig(), getSimulatorConfig());
        const salesOrder = new SalesOrder(null, 'any', 1, 1);

        db.placeSalesOrder(salesOrder);

        expect(salesOrder.salesOrderNumber).not.toBeNull();
    });

    test('new salesOrder is added to unscheduled orders', () => {
        const db = new PersistentDatabase(getPlantConfig(), getSimulatorConfig());
        const salesOrder = new SalesOrder(null, 'any', 1, 1);

        db.placeSalesOrder(salesOrder);

        const order = db.unscheduledProductionOrders.find((o) => {
            return o.salesOrderNumber === salesOrder.salesOrderNumber;
        });
        expect(order).not.toBeNull();
    });

    test('new salesOrder is added to open sales orders', () => {
        const db = new PersistentDatabase(getPlantConfig(), getSimulatorConfig());
        const salesOrder = new SalesOrder(null, 'any', 1, 1);

        db.placeSalesOrder(salesOrder);

        const order = db.openSalesOrders.find((o) => {
            return o.salesOrderNumber === salesOrder.salesOrderNumber;
        });
        expect(order).not.toBeNull();
    });
});

describe('planProductionOrder', () => {
    test('valid order is moved from unscheduled orders to scheduled orders', () => {
        const db = new PersistentDatabase(getPlantConfig(), getSimulatorConfig());
        const prodOrder = new ProductionOrder('unit-test-2', 'any', 1);
        db._addUnscheduledProductionOrder(prodOrder);

        db.planProductionOrder(prodOrder);

        const order = db.unscheduledProductionOrders.find((o) => {
            return o.productionOrderNumber === prodOrder.productionOrderNumber;
        });
        const order2 = db.scheduledProductionOrders.find((o) => {
            return o.productionOrderNumber === prodOrder.productionOrderNumber;
        });
        expect(order).toBeUndefined();
        expect(order2).not.toBeUndefined();
    });

    test('valid order is removed and leaves remaining unscheduled orders', () => {
        const db = new PersistentDatabase(getPlantConfig(), getSimulatorConfig());
        const prodOrders = [
            new ProductionOrder('unit-test-2', 'any', 1),
            new ProductionOrder('unit-test-3', 'any', 1),
            new ProductionOrder('unit-test-4', 'any', 1)
        ];
        prodOrders.forEach((po) => {
            po.assignNumber(po.salesOrderNumber);
            db._addUnscheduledProductionOrder(po);
        });

        db.planProductionOrder(prodOrders[1]); // unit-test-3

        expect(db.unscheduledProductionOrders.length).toBe(2);
        expect(db.unscheduledProductionOrders[0].salesOrderNumber).toBe('unit-test-2');
        expect(db.unscheduledProductionOrders[1].salesOrderNumber).toBe('unit-test-4');
    });

    test('invalid order is reported as error', () => {
        const db = new PersistentDatabase(getPlantConfig(), getSimulatorConfig());
        const prodOrder = new ProductionOrder('unit-test-2', 'any', 1);
        // setup.addUnscheduledProductionOrder(prodOrder);

        expect(() => {
            db.planProductionOrder(prodOrder);
        }).toThrow();
    });
});
