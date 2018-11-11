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

const setup = {
    addScheduledProductionOrder: async (db, salesOrderNumber, partNumber, orderQuantity) => {
        const order = new ProductionOrder(salesOrderNumber, partNumber, orderQuantity);
        order.assignNumber(`po-${salesOrderNumber}`);
        await db._addScheduledProductionOrder(order);
        return order;
    },
    addUnscheduledProductionOrder: async (db, salesOrderNumber, partNumber, orderQuantity) => {
        const order = new ProductionOrder(salesOrderNumber, partNumber, orderQuantity);
        order.assignNumber(`po-${salesOrderNumber}`);
        await db._addUnscheduledProductionOrder(order);
        return order;
    }
};

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
        await setup.addScheduledProductionOrder(db, 'unit-test-1', 'unit-test-1', db.maximumProductionCapacity / 2);

        const availableCapacity = await db.getAvailableProductionScheduleCapacity();

        expect(availableCapacity).toBe(db.maximumProductionCapacity / 2);
    });

    test('some scheduled , some unscheduled: remaining capacity available', async () => {
        const db = new PersistentDatabase(getPlantConfig({
            productionCapacityPerInterval: 10,
            productionLines: 1
        }), getSimulatorConfig());
        await setup.addScheduledProductionOrder(db, 'unit-test-1', 'unit-test-1', 2);
        await setup.addUnscheduledProductionOrder(db, 'unit-test-2', 'unit-test-2', 2);

        const availableCapacity = await db.getAvailableProductionScheduleCapacity();

        expect(availableCapacity).toBe(db.maximumProductionCapacity - 4);
    });

    test('no scheduled, half unscheduled: half capacity available', async () => {
        const db = new PersistentDatabase(getPlantConfig({
            productionCapacityPerInterval: 10,
            productionLines: 1
        }), getSimulatorConfig());
        await setup.addUnscheduledProductionOrder(db, 'unit-test-2', 'unit-test-2', db.maximumProductionCapacity / 2);

        const availableCapacity = await db.getAvailableProductionScheduleCapacity();

        expect(availableCapacity).toBe(db.maximumProductionCapacity / 2);
    });
});

describe('placeSalesOrder', () => {
    test('new salesOrder is assigned a Sales Order Number', async () => {
        const db = new PersistentDatabase(getPlantConfig(), getSimulatorConfig());
        const salesOrder = new SalesOrder(null, 'any', 1, 1);

        db.placeSalesOrder(salesOrder);

        expect(salesOrder.salesOrderNumber).not.toBeNull();
    });

    test('new salesOrder is added to unscheduled production orders', async () => {
        const db = new PersistentDatabase(getPlantConfig(), getSimulatorConfig());
        const salesOrder = new SalesOrder(null, 'any', 1, 1);

        db.placeSalesOrder(salesOrder);

        const orders = await db._getUnscheduledProductionOrders();
        const order = orders.find(async (o) => {
            return o.salesOrderNumber === salesOrder.salesOrderNumber;
        });
        expect(order).not.toBeNull();
    });

    test('new salesOrder is added to open sales orders', async () => {
        const db = new PersistentDatabase(getPlantConfig(), getSimulatorConfig());
        const salesOrder = new SalesOrder(null, 'any', 1, 1);

        db.placeSalesOrder(salesOrder);

        const orders = await db._getOpenSalesOrders();
        const order = orders.find(async (o) => {
            return o.salesOrderNumber === salesOrder.salesOrderNumber;
        });
        expect(order).not.toBeNull();
    });
});

describe('planProductionOrder', () => {
    test('valid order is moved from unscheduled orders to scheduled orders', async () => {
        const db = new PersistentDatabase(getPlantConfig(), getSimulatorConfig());
        const prodOrder = await setup.addUnscheduledProductionOrder(db, 'unit-test-1', 'unit-test-1', 1);

        db.planProductionOrder(prodOrder);

        // no longer in unscheduled orders
        const unscheduledOrders = await db._getUnscheduledProductionOrders();
        expect(unscheduledOrders).toEqual([]);
        // now in scheduled orders
        const scheduledOrders = await db._getScheduledProductionOrders();
        const order = scheduledOrders.find(async (o) => {
            return o.productOrderNumber === prodOrder.productOrderNumber;
        });
        expect(order).not.toBeUndefined();
    });

    test('valid order is removed and leaves remaining unscheduled orders', async () => {
        const db = new PersistentDatabase(getPlantConfig(), getSimulatorConfig());
        const prodOrders = await Promise.all([
            setup.addUnscheduledProductionOrder(db, 'unit-test-2', 'unit-test-2', 1),
            setup.addUnscheduledProductionOrder(db, 'unit-test-3', 'unit-test-3', 1),
            setup.addUnscheduledProductionOrder(db, 'unit-test-4', 'unit-test-4', 1)
        ]);

        db.planProductionOrder(prodOrders[1]); // unit-test-3

        const unscheduledProductionOrders = await db._getUnscheduledProductionOrders();
        expect(unscheduledProductionOrders.length).toBe(2);
        expect(unscheduledProductionOrders[0].salesOrderNumber).toBe('unit-test-2');
        expect(unscheduledProductionOrders[1].salesOrderNumber).toBe('unit-test-4');
    });

});
