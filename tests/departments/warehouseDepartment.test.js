const CentralDatabase = require('../../src/centralDatabase');
const PlantConfig = require('../../src/plantConfig');
const WarehouseDepartment = require('../../src/departments/warehouseDepartment');
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

describe('receivePurchasedParts', () => {
    test('no decisions yet', () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const dept = new WarehouseDepartment(config, db);

        const decision = dept.receivePurchasedParts();

        expect(decision.getActionCount()).toBe(0);
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
    test('no decisions yet', () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const dept = new WarehouseDepartment(config, db);

        const decision = dept.receivePurchasedParts();

        expect(decision.getActionCount()).toBe(0);
    });
});
