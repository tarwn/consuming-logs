const CentralDatabase = require('../../src/centralDatabase');
const PlantConfig = require('../../src/plantConfig');
const WarehouseDepartment = require('../../src/departments/warehouseDepartment');
const PurchaseOrder = require('../../src/dtos/purchaseOrder');
const FakeProducer = require('../fakeProducer');
const PurchaseOrderReceivedEvent = require('../../src/events/purchaseOrderReceived');
const PurchaseOrderShipmentUpdatedEvent = require('../../src/events/purchaseOrderShipmentUpdated');
const PartsInventoryIncreasedEvent = require('../../src/events/partsInventoryIncreased');

const SINGLE_PART_PRODUCT = 'fg-1';
const DOUBLE_PART_PRODUCT = 'fg-2';

function getTestConfig() {
    return new PlantConfig({
        productionCapacityPerInterval: 10,
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

describe('receivePurchasedParts', () => {
    test('no decisions yet', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const dept = new WarehouseDepartment(config, db);
        const producer = new FakeProducer();

        const decision = dept.receivePurchasedParts();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(0);
    });

    test('shipments haven\'t arrived yet, no parts to receive', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const dept = new WarehouseDepartment(config, db);
        const producer = new FakeProducer();
        db.openPurchaseOrders.push(new PurchaseOrder('po-123', 'raw-1', 1, 1));
        db.openPurchaseOrders[0].assignShippingTime(1);

        const decision = dept.receivePurchasedParts();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(0);
    });

    test('a shipment has arrived, receive the shipment and parts from order', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const dept = new WarehouseDepartment(config, db);
        const producer = new FakeProducer();
        const purchaseQuantity = 123;
        db.openPurchaseOrders.push(new PurchaseOrder('po-123', 'raw-1', purchaseQuantity, 1));
        db.openPurchaseOrders[0].assignShippingTime(0);

        const decision = dept.receivePurchasedParts();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(1);
        expect(producer.messages).toContainInstanceOf(PurchaseOrderReceivedEvent);
        expect(producer.messages).toContainInstanceOf(PartsInventoryIncreasedEvent);
        // this is testing the db.receivePurchaseOrder behavior
        expect(db.openPurchaseOrders).toHaveLength(0);
        expect(db.closedPurchaseOrders).toHaveLength(1);
        expect(db.partsInventory['raw-1']).toBe(purchaseQuantity);
    });

    test('multiple shipments have arrived, receive the shipments and parts from orders', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const dept = new WarehouseDepartment(config, db);
        const producer = new FakeProducer();
        const purchaseQuantity = 123;
        for (let i = 0; i < 3; i++) {
            db.openPurchaseOrders.push(new PurchaseOrder('po-123', 'raw-1', purchaseQuantity, 1));
            db.openPurchaseOrders[i].assignShippingTime(0);
        }

        const decision = dept.receivePurchasedParts();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(3);
        expect(producer.messages).toContainInstanceOf(PurchaseOrderReceivedEvent);
        expect(producer.messages).toContainInstanceOf(PartsInventoryIncreasedEvent);
        // this is testing the db.receivePurchaseOrder behavior
        expect(db.openPurchaseOrders).toHaveLength(0);
        expect(db.closedPurchaseOrders).toHaveLength(3);
        expect(db.partsInventory['raw-1']).toBe(purchaseQuantity * 3);
    });
});

describe('shipCompletedSalesOrders', () => {
    test('no decisions yet', () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const dept = new WarehouseDepartment(config, db);

        const decision = dept.shipCompletedSalesOrders();

        expect(decision.getActionCount()).toBe(0);
    });
});

describe('updatePendingPurchaseOrders', () => {
    test('no active shipments leads to no new decisions', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new WarehouseDepartment(config, db);

        const decision = dept.updatePendingPurchaseOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(0);
    });

    test('active shipment on doorstep leads to no new decisions', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new WarehouseDepartment(config, db);
        db.openPurchaseOrders.push(new PurchaseOrder('po-123', 'raw-1', 1, 1));
        db.openPurchaseOrders[0].assignShippingTime(0);

        const decision = dept.updatePendingPurchaseOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(0);
    });

    test('pending shipment gets an updated ship time', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new WarehouseDepartment(config, db);
        db.openPurchaseOrders.push(new PurchaseOrder('po-123', 'raw-1', 1, 1));
        db.openPurchaseOrders[0].assignShippingTime(1);

        const decision = dept.updatePendingPurchaseOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(1);
        expect(producer.messages).toContainInstanceOf(PurchaseOrderShipmentUpdatedEvent);
    });
});
