const CentralDatabase = require('../../src/centralDatabase');
const PlantConfig = require('../../src/plantConfig');
const SalesDepartment = require('../../src/departments/salesDepartment');
const ProductionOrder = require('../../src/dtos/productionOrder');
const FakeProducer = require('../fakeProducer');

const SINGLE_PART_PRODUCT = 'fg-1';
const DOUBLE_PART_PRODUCT = 'fg-2';

function getTestConfig() {
    return new PlantConfig({
        minimumOrderSize: 5,
        productionCapacityPerInterval: 10,
        productionLines: 1,
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

describe('generateOrdersIfCapacityIsAvailable', () => {
    test('no available capacity results in booking no new sales', () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const dept = new SalesDepartment(config, db);
        const maxCapacity = config.productionCapacityPerInterval * config.productionLines;
        db.scheduledProductionOrders.push(new ProductionOrder('so-123', SINGLE_PART_PRODUCT, maxCapacity));

        const decision = dept.generateOrdersIfCapacityIsAvailable();

        expect(decision.getActionCount()).toBe(0);
    });

    test('just enough capacity for one order results in booking one order', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const dept = new SalesDepartment(config, db);
        const producer = new FakeProducer();
        const usedCapacity = (config.productionCapacityPerInterval * config.productionLines) -
            config.minimumOrderSize;
        db.scheduledProductionOrders.push(new ProductionOrder('so-123', SINGLE_PART_PRODUCT, usedCapacity));

        const decision = dept.generateOrdersIfCapacityIsAvailable();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(1);
        expect(db.openSalesOrders).toHaveLength(1);
        expect(producer.messages).toHaveLength(1);
        expect(db.getAvailableProductionScheduleCapacity()).toBe(0);
    });
});
