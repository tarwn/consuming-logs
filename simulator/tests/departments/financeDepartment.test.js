const CentralDatabase = require('../../src/centralDatabase');
const PlantConfig = require('../../src/plantConfig');
const FinanceDepartment = require('../../src/departments/financeDepartment');
const PurchaseOrder = require('../../src/dtos/purchaseOrder');
const SalesOrder = require('../../src/dtos/salesOrder');
const FakeProducer = require('../fakeProducer');
const PurchaseOrderPaidEvent = require('../../src/events/purchaseOrderPaid');
const SalesOrderInvoicedEvent = require('../../src/events/salesOrderInvoiced');
const SalesOrderInvoicePaidEvent = require('../../src/events/salesOrderInvoicePaid');

const SINGLE_PART_PRODUCT = 'fg-1';
const DOUBLE_PART_PRODUCT = 'fg-2';

function getTestConfig() {
    return new PlantConfig({
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
    });
}

describe('payForReceivedPurchaseOrders', () => {
    test('no orders pending payment results in no outgoing payments', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new FinanceDepartment(config, db);

        const decision = dept.payForReceivedPurchaseOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(0);
        expect(producer.messages).toHaveLength(0);
        expect(db.cash).toBe(0);
    });

    test('one order pending payment results in order being paid', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new FinanceDepartment(config, db);
        db.unbilledPurchaseOrders.push(new PurchaseOrder('po-123', 'raw-1', 100, 1.50));

        const decision = dept.payForReceivedPurchaseOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(1);
        expect(producer.messages).toContainInstanceOf(PurchaseOrderPaidEvent);
        expect(db.cash).toBe(100 * -1.50);
    });

    test('multiple orders pending payment results in paying all of the orders', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new FinanceDepartment(config, db);
        db.unbilledPurchaseOrders.push(new PurchaseOrder('po-123', 'raw-1', 100, 1.50));
        db.unbilledPurchaseOrders.push(new PurchaseOrder('po-123', 'raw-1', 100, 1.50));
        db.unbilledPurchaseOrders.push(new PurchaseOrder('po-123', 'raw-1', 100, 1.50));

        const decision = dept.payForReceivedPurchaseOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(3);
        expect(producer.messages).toContainInstancesOf(PurchaseOrderPaidEvent, 3);
        expect(db.cash).toBe(3 * 100 * -1.50);
    });
});

describe('billForShippedSalesOrders', () => {
    test('no shipped orders results in no decisions', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new FinanceDepartment(config, db);

        const decision = dept.billForShippedSalesOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(0);
        expect(producer.messages).toHaveLength(0);
        expect(db.cash).toBe(0);
    });

    test('one shipped orders results in invoiving for one order', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new FinanceDepartment(config, db);
        db.shippedSalesOrders.push(new SalesOrder('so-123', SINGLE_PART_PRODUCT, 100, 1.23));

        const decision = dept.billForShippedSalesOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(1);
        expect(producer.messages).toHaveLength(2);
        expect(producer.messages).toContainInstanceOf(SalesOrderInvoicedEvent);
        expect(producer.messages).toContainInstanceOf(SalesOrderInvoicePaidEvent);
        expect(db.shippedSalesOrders).toHaveLength(0);
        expect(db.closedSalesOrders).toHaveLength(1);
        expect(db.cash).toBe(100 * 1.23);
    });

    test('multiple shipped orders results in invoicing for multiple orders', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new FinanceDepartment(config, db);
        for (let i = 0; i < 3; i++) {
            db.shippedSalesOrders.push(new SalesOrder(`so-123-${i}`, SINGLE_PART_PRODUCT, 100, 1.23));
        }

        const decision = dept.billForShippedSalesOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(3);
        expect(producer.messages).toHaveLength(6);
        expect(producer.messages).toContainInstancesOf(SalesOrderInvoicedEvent, 3);
        expect(producer.messages).toContainInstancesOf(SalesOrderInvoicePaidEvent, 3);
        expect(db.shippedSalesOrders).toHaveLength(0);
        expect(db.closedSalesOrders).toHaveLength(3);
        expect(db.cash).toBe(3 * 100 * 1.23);
    });
});
