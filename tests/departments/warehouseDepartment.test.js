const CentralDatabase = require('../../src/centralDatabase');
const PlantConfig = require('../../src/plantConfig');
const WarehouseDepartment = require('../../src/departments/warehouseDepartment');
const PurchaseOrder = require('../../src/dtos/purchaseOrder');
const ProductionOrder = require('../../src/dtos/productionOrder');
const SalesOrder = require('../../src/dtos/salesOrder');
const Shipment = require('../../src/dtos/shipment');
const FakeProducer = require('../fakeProducer');
const PurchaseOrderReceivedEvent = require('../../src/events/purchaseOrderReceived');
const ShipmentArrivedEvent = require('../../src/events/shipmentArrived');
const PartsInventoryIncreasedEvent = require('../../src/events/partsInventoryIncreased');
const SalesOrderShippedEvent = require('../../src/events/salesOrderShipped');
const ShipmentTrackingUpdatedEvent = require('../../src/events/shipmentTrackingUpdated');

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
        db.shipShipment(new Shipment(null, 'PurchaseOrder', 'po-123', 'raw-1', 1));
        db.trackedShipments[0].assignShippingTime(1);

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
        db.shipShipment(new Shipment(null, 'PurchaseOrder', 'po-123', 'raw-1', 1));
        db.trackedShipments[0].assignShippingTime(0);

        const decision = dept.receivePurchasedParts();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(1);
        expect(producer.messages).toContainInstanceOf(ShipmentArrivedEvent);
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
            db.openPurchaseOrders.push(new PurchaseOrder(`po-123-${i}`, 'raw-1', purchaseQuantity, 1));
            db.shipShipment(new Shipment(null, 'PurchaseOrder', `po-123-${i}`, 'raw-1', 1));
            db.trackedShipments[i].assignShippingTime(0);
        }

        const decision = dept.receivePurchasedParts();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(3);
        expect(producer.messages).toContainInstancesOf(ShipmentArrivedEvent, 3);
        expect(producer.messages).toContainInstancesOf(PurchaseOrderReceivedEvent, 3);
        expect(producer.messages).toContainInstancesOf(PartsInventoryIncreasedEvent, 3);
        // this is testing the db.receivePurchaseOrder behavior
        expect(db.openPurchaseOrders).toHaveLength(0);
        expect(db.closedPurchaseOrders).toHaveLength(3);
        expect(db.partsInventory['raw-1']).toBe(purchaseQuantity * 3);
    });
});

describe('shipCompletedSalesOrders', () => {
    test('no completed production orders results in no new shipments', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new WarehouseDepartment(config, db);
        db.scheduledProductionOrders.push(new ProductionOrder('so-123', SINGLE_PART_PRODUCT, 100));

        const decision = dept.shipCompletedSalesOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(0);
        expect(producer.messages.length).toBe(0);
    });

    test('one completed production orders results in one new shipment', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new WarehouseDepartment(config, db);
        const so = new SalesOrder('so-123', SINGLE_PART_PRODUCT, 100, 1.00);
        db.openSalesOrders.push(so);
        const po = so.generateProductionOrder();
        db.scheduledProductionOrders.push(po);
        db.produceFinishedGoods(po.productionOrderNumber, SINGLE_PART_PRODUCT, 100);

        const decision = dept.shipCompletedSalesOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(1);
        expect(producer.messages).toContainInstanceOf(SalesOrderShippedEvent);
        expect(db.scheduledProductionOrders).toHaveLength(0);
        expect(db.openSalesOrders).toHaveLength(0);
        expect(db.shippedSalesOrders).toHaveLength(1);
        expect(db.trackedShipments).toHaveLength(1);
    });

    test('multiple completed production orders results in multiple new shipments', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new WarehouseDepartment(config, db);
        for (let i = 0; i < 3; i++) {
            const so = new SalesOrder(`so-123-${i}`, SINGLE_PART_PRODUCT, 100, 1.00);
            db.openSalesOrders.push(so);
            const po = so.generateProductionOrder();
            db.scheduledProductionOrders.push(po);
            db.produceFinishedGoods(po.productionOrderNumber, SINGLE_PART_PRODUCT, 100);
        }

        const decision = dept.shipCompletedSalesOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(3);
        expect(producer.messages).toContainInstancesOf(SalesOrderShippedEvent, 3);
        expect(db.scheduledProductionOrders).toHaveLength(0);
        expect(db.openSalesOrders).toHaveLength(0);
        expect(db.shippedSalesOrders).toHaveLength(3);
        expect(db.trackedShipments).toHaveLength(3);
    });
});

describe('stopTrackingDeliveredSalesOrders', () => {
    test('no active shipments leads to no new decisions', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new WarehouseDepartment(config, db);

        const decision = dept.stopTrackingDeliveredSalesOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(0);
        expect(producer.messages.length).toBe(0);
        expect(db.trackedShipments.length).toBe(0);
        expect(db.shippingHistory.length).toBe(0);
    });

    test('in transit shipment leads to no new decisions', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new WarehouseDepartment(config, db);
        db.shipShipment(new Shipment(null, 'SalesOrder', 'so-123', SINGLE_PART_PRODUCT, 100));
        db.trackedShipments[0].assignShippingTime(1);

        const decision = dept.stopTrackingDeliveredSalesOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(0);
        expect(producer.messages.length).toBe(0);
        expect(db.trackedShipments.length).toBe(1);
        expect(db.shippingHistory.length).toBe(0);
    });

    test('arrived shipment is moved from active tracking to historical shipments', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new WarehouseDepartment(config, db);
        db.shipShipment(new Shipment(null, 'SalesOrder', 'so-123', SINGLE_PART_PRODUCT, 100));
        db.trackedShipments[0].assignShippingTime(0);

        const decision = dept.stopTrackingDeliveredSalesOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(1);
        expect(producer.messages).toContainInstanceOf(ShipmentArrivedEvent);
        expect(db.trackedShipments.length).toBe(0);
        expect(db.shippingHistory.length).toBe(1);
    });
});

describe('updateTrackingForInTransitShipments', () => {
    test('no active shipments leads to no new decisions', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new WarehouseDepartment(config, db);

        const decision = dept.updateTrackingForInTransitShipments();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(0);
    });

    test('active shipment that has arrived leads to no new decisions', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new WarehouseDepartment(config, db);
        db.openPurchaseOrders.push(new PurchaseOrder('po-123', 'raw-1', 1, 1));
        db.shipShipment(new Shipment(null, 'PurchaseOrder', 'po-123', 'raw-1', 1));
        db.trackedShipments[0].assignShippingTime(0);

        const decision = dept.updateTrackingForInTransitShipments();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(0);
    });

    test('in transit shipment gets an updated ship time', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new WarehouseDepartment(config, db);
        db.openPurchaseOrders.push(new PurchaseOrder('po-123', 'raw-1', 1, 1));
        db.shipShipment(new Shipment('PurchaseOrder', 'po-123', 'raw-1', 1));

        const decision = dept.updateTrackingForInTransitShipments();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(1);
        expect(producer.messages).toContainInstanceOf(ShipmentTrackingUpdatedEvent);
    });
});
