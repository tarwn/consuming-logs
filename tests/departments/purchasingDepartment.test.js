const CentralDatabase = require('../../src/centralDatabase');
const PlantConfig = require('../../src/plantConfig');
const PurchasingDepartment = require('../../src/departments/purchasingDepartment');
const ProductionOrder = require('../../src/dtos/productionOrder');
const FakeProducer = require('../fakeProducer');

const SINGLE_PART_PRODUCT = 'fg-1';
const DOUBLE_PART_PRODUCT = 'fg-2';

function getTestConfig() {
    return new PlantConfig({
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
    });
}

describe('orderPartsForPlannedOrders', () => {
    test('no scheduled orders results in no decisions', () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const dept = new PurchasingDepartment(config, db);

        const decision = dept.orderPartsForPlannedOrders();

        expect(decision.getActionCount()).toBe(0);
    });

    test('one scheduled FG order results with no raw inventory results in PO for FG quantity of raw parts', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const dept = new PurchasingDepartment(config, db);
        const producer = new FakeProducer();
        db.scheduledProductionOrders.push(new ProductionOrder('so-123', SINGLE_PART_PRODUCT, 123));
        db.partsInventory['raw-1'] = 0;

        const decision = dept.orderPartsForPlannedOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(1);
        expect(db.openPurchaseOrders).toHaveLength(1);
        expect(db.openPurchaseOrders[0].partNumber).toBe('raw-1');
        expect(db.openPurchaseOrders[0].quantity).toBe(123);
        expect(producer.messages).toHaveLength(1);
    });

    test('one scheduled FG order results with necessary raw inventory results in no new actions', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const dept = new PurchasingDepartment(config, db);
        const producer = new FakeProducer();
        db.scheduledProductionOrders.push(new ProductionOrder('so-123', SINGLE_PART_PRODUCT, 123));
        db.partsInventory['raw-1'] = 123;

        const decision = dept.orderPartsForPlannedOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(0);
        expect(db.openPurchaseOrders).toHaveLength(0);
    });

    test('one partially complete FG order with no raw inventory results in PO for remaining FG quantity of raw parts', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const dept = new PurchasingDepartment(config, db);
        const producer = new FakeProducer();
        db.scheduledProductionOrders.push(new ProductionOrder('so-123', SINGLE_PART_PRODUCT, 123));
        db.scheduledProductionOrders[0].increaseCompletedQuantity(100);
        db.partsInventory['raw-1'] = 0;

        const decision = dept.orderPartsForPlannedOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(1);
        expect(db.openPurchaseOrders).toHaveLength(1);
        expect(db.openPurchaseOrders[0].partNumber).toBe('raw-1');
        expect(db.openPurchaseOrders[0].quantity).toBe(123 - 100);
        expect(producer.messages).toHaveLength(1);
    });

    test('one partially complete FG order with full raw inventory results in no new actions', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const dept = new PurchasingDepartment(config, db);
        const producer = new FakeProducer();
        db.scheduledProductionOrders.push(new ProductionOrder('so-123', SINGLE_PART_PRODUCT, 123));
        db.scheduledProductionOrders[0].increaseCompletedQuantity(100);
        db.partsInventory['raw-1'] = 23;

        const decision = dept.orderPartsForPlannedOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(0);
        expect(db.openPurchaseOrders).toHaveLength(0);
    });

    test('one scheduled multi-part FG order results with no raw inventory results in PO for FG quantity of raw parts', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const dept = new PurchasingDepartment(config, db);
        const producer = new FakeProducer();
        db.scheduledProductionOrders.push(new ProductionOrder('so-123', DOUBLE_PART_PRODUCT, 123));
        db.partsInventory['raw-1'] = 0;
        db.partsInventory['raw-2'] = 0;

        const decision = dept.orderPartsForPlannedOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(2);
        expect(db.openPurchaseOrders).toHaveLength(2);
        expect(db.openPurchaseOrders[0].partNumber).toBe('raw-1');
        expect(db.openPurchaseOrders[0].quantity).toBe(123);
        expect(db.openPurchaseOrders[1].partNumber).toBe('raw-2');
        expect(db.openPurchaseOrders[1].quantity).toBe(123);
        expect(producer.messages).toHaveLength(2);
    });
});

describe('payForReceivedPurchaseOrders', () => {
    test('no decisions yet', () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const dept = new PurchasingDepartment(config, db);

        const decision = dept.payForReceivedPurchaseOrders();

        expect(decision.getActionCount()).toBe(0);
    });
});

describe('billForShippedSalesOrders', () => {
    test('no decisions yet', () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const dept = new PurchasingDepartment(config, db);

        const decision = dept.billForShippedSalesOrders();

        expect(decision.getActionCount()).toBe(0);
    });
});