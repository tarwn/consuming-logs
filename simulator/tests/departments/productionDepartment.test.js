const CentralDatabase = require('../../src/centralDatabase');
const PlantConfig = require('../../src/plantConfig');
const ProductionDepartment = require('../../src/departments/productionDepartment');
const ProductionOrder = require('../../src/dtos/productionOrder');
const FakeProducer = require('../fakeProducer');
const FinishedGoodsInventoryUpdatedEvent = require('../../src/events/finishedGoodsInventoryUpdated');
const FinishedGoodsProducedEvent = require('../../src/events/finishedGoodsProduced');
const FinishedGoodsScrappedEvent = require('../../src/events/finishedGoodsScrapped');
const ProductionIdleEvent = require('../../src/events/productionIdle');
const ProductionOrderCompletedEvent = require('../../src/events/productionOrderCompleted');
const PartsInventoryConsumedEvent = require('../../src/events/partsInventoryConsumed');

const SINGLE_PART_PRODUCT = 'fg-1';
const DOUBLE_PART_PRODUCT = 'fg-2';

function getTestConfig(overrides) {
    const configs = {
        productionCapacityPerInterval: 10,
        maximumIntervalsToSchedule: 20,
        productCatalog: [
            {
                partNumber: SINGLE_PART_PRODUCT, name: 'FG w/ 1 part', unitPrice: 1.23, bom: { 'raw-1': 1 }
            },
            {
                partNumber: DOUBLE_PART_PRODUCT, name: 'FG w/ 2 parts', unitPrice: 1.23, bom: { 'raw-1': 1, 'raw-2': 1 }
            }
        ],
        partsCatalog: [
            { partNumber: 'raw-1', unitPrice: 0.10 },
            { partNumber: 'raw-2', unitPrice: 0.15 }
        ]
    };

    if (overrides) {
        Object.keys(overrides).forEach((k) => {
            configs[k] = overrides[k];
        });
    }

    return new PlantConfig(configs);
}

describe('runPlannedProductionOrders', () => {
    test('no planned production orders means production sits idle', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new ProductionDepartment(config, db);

        const decision = await dept.runPlannedProductionOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(0);
        expect(producer.messages).toHaveLength(0);
    });

    test('one new planned production order, production runs 1 cycle on it', async () => {
        const config = getTestConfig({
            productionLines: 1,
            productionCapacityPerInterval: 10,
            productionScrapPercentage: 0.0
        });
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new ProductionDepartment(config, db);
        db.scheduledProductionOrders.push(new ProductionOrder('so-123', SINGLE_PART_PRODUCT, 100));
        db.finishedInventory[SINGLE_PART_PRODUCT] = 0;
        db.partsInventory['raw-1'] = 100;

        const decision = await dept.runPlannedProductionOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(1);
        expect(producer.messages).toHaveLength(3);
        expect(producer.messages).toContainInstanceOf(PartsInventoryConsumedEvent);
        expect(producer.messages).toContainInstanceOf(FinishedGoodsProducedEvent);
        expect(producer.messages).toContainInstanceOf(FinishedGoodsInventoryUpdatedEvent);
        expect(db.scheduledProductionOrders[0].completedQuantity).toBe(10);
        expect(db.finishedInventory[SINGLE_PART_PRODUCT]).toBe(10);
        expect(db.partsInventory['raw-1']).toBe(100 - 10);
    });

    test('one new planned production order w/ no raw materials, means no output this cycle', async () => {
        const config = getTestConfig({
            productionLines: 1,
            productionCapacityPerInterval: 10,
            productionScrapPercentage: 0.0
        });
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new ProductionDepartment(config, db);
        db.scheduledProductionOrders.push(new ProductionOrder('so-123', SINGLE_PART_PRODUCT, 100));
        db.finishedInventory[SINGLE_PART_PRODUCT] = 0;
        db.partsInventory['raw-1'] = 0;

        const decision = await dept.runPlannedProductionOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(1);
        expect(producer.messages).toHaveLength(1);
        expect(producer.messages).toContainInstanceOf(ProductionIdleEvent);
        expect(db.scheduledProductionOrders[0].completedQuantity).toBe(0);
        expect(db.finishedInventory[SINGLE_PART_PRODUCT]).toBe(0);
    });

    test('one new planned production order w/ partial raw materials, means partial output this cycle', async () => {
        const config = getTestConfig({
            productionLines: 1,
            productionCapacityPerInterval: 10,
            productionScrapPercentage: 0.0
        });
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new ProductionDepartment(config, db);
        db.scheduledProductionOrders.push(new ProductionOrder('so-123', SINGLE_PART_PRODUCT, 100));
        db.finishedInventory[SINGLE_PART_PRODUCT] = 0;
        db.partsInventory['raw-1'] = 5;

        const decision = await dept.runPlannedProductionOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(1);
        expect(producer.messages).toHaveLength(3);
        expect(producer.messages).toContainInstanceOf(PartsInventoryConsumedEvent);
        expect(producer.messages).toContainInstanceOf(FinishedGoodsProducedEvent);
        expect(producer.messages).toContainInstanceOf(FinishedGoodsInventoryUpdatedEvent);
        expect(db.scheduledProductionOrders[0].completedQuantity).toBe(5);
        expect(db.finishedInventory[SINGLE_PART_PRODUCT]).toBe(5);
        expect(db.partsInventory['raw-1']).toBe(0);
    });

    test('one nearly finished production order, production runs 1 cycle on it and doesn\'t overproduce', async () => {
        const config = getTestConfig({
            productionLines: 1,
            productionCapacityPerInterval: 10,
            productionScrapPercentage: 0.0
        });
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new ProductionDepartment(config, db);
        db.scheduledProductionOrders.push(new ProductionOrder('so-123', SINGLE_PART_PRODUCT, 100));
        db.scheduledProductionOrders[0].increaseCompletedQuantity(95);
        db.finishedInventory[SINGLE_PART_PRODUCT] = 95;
        db.partsInventory['raw-1'] = 100;

        const decision = await dept.runPlannedProductionOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(1);
        expect(producer.messages).toHaveLength(4);
        expect(producer.messages).toContainInstanceOf(PartsInventoryConsumedEvent);
        expect(producer.messages).toContainInstanceOf(FinishedGoodsProducedEvent);
        expect(producer.messages).toContainInstanceOf(FinishedGoodsInventoryUpdatedEvent);
        expect(producer.messages).toContainInstanceOf(ProductionOrderCompletedEvent);
        expect(db.scheduledProductionOrders[0].completedQuantity).toBe(100);
        expect(db.finishedInventory[SINGLE_PART_PRODUCT]).toBe(100);
        expect(db.partsInventory['raw-1']).toBe(100 - 5);
    });

    test('production runs 1 interval and scraps 10%, only producing 90% of normal amount', async () => {
        const config = getTestConfig({
            productionLines: 1,
            productionCapacityPerInterval: 10,
            productionScrapPercentage: 0.10
        });
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new ProductionDepartment(config, db);
        db.scheduledProductionOrders.push(new ProductionOrder('so-123', SINGLE_PART_PRODUCT, 100));
        db.finishedInventory[SINGLE_PART_PRODUCT] = 0;
        db.partsInventory['raw-1'] = 100;

        const decision = await dept.runPlannedProductionOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(1);
        expect(producer.messages).toHaveLength(4);
        expect(producer.messages).toContainInstanceOf(PartsInventoryConsumedEvent);
        expect(producer.messages).toContainInstanceOf(FinishedGoodsProducedEvent);
        expect(producer.messages).toContainInstanceOf(FinishedGoodsScrappedEvent);
        expect(producer.messages).toContainInstanceOf(FinishedGoodsInventoryUpdatedEvent);
        const expectedOutput = config.productionCapacityPerInterval *
            (1 - config.productionScrapPercentage);
        expect(db.scheduledProductionOrders[0].completedQuantity).toBe(expectedOutput);
        expect(db.finishedInventory[SINGLE_PART_PRODUCT]).toBe(expectedOutput);
        expect(db.partsInventory['raw-1']).toBe(100 - 10);
    });
});
