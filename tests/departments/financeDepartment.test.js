const CentralDatabase = require('../../src/centralDatabase');
const PlantConfig = require('../../src/plantConfig');
const FinanceDepartment = require('../../src/departments/financeDepartment');
const PurchaseOrder = require('../../src/dtos/purchaseOrder');
const FakeProducer = require('../fakeProducer');
const PurchaseOrderPaidEvent = require('../../src/events/purchaseOrderPaid');

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
    });

    test('one orders pending payment results in order being paid', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const producer = new FakeProducer();
        const dept = new FinanceDepartment(config, db);
        db.unbilledPurchaseOrders.push(new PurchaseOrder('po-123', 'raw-1', 100, 1.50));

        const decision = dept.payForReceivedPurchaseOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(1);
        expect(producer.messages).toContainInstanceOf(PurchaseOrderPaidEvent);
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
        expect(producer.messages).toContainInstanceOf(PurchaseOrderPaidEvent);
        expect(producer.messages).toHaveLength(3);
    });
});

describe('billForShippedSalesOrders', () => {
    test('no decisions yet', () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const dept = new FinanceDepartment(config, db);

        const decision = dept.billForShippedSalesOrders();

        expect(decision.getActionCount()).toBe(0);
    });
});