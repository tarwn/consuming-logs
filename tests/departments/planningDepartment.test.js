const CentralDatabase = require('../../src/centralDatabase');
const PlantConfig = require('../../src/plantConfig');
const PlanningDepartment = require('../../src/departments/planningDepartment');
const ProductionOrder = require('../../src/dtos/productionOrder');
const FakeProducer = require('../fakeProducer');

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

describe('planUnscheduledProductionOrders', () => {
    test('no unscheduled orders results in no decisions', () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        const dept = new PlanningDepartment(config, db);

        const decision = dept.planUnscheduledProductionOrders();

        expect(decision.getActionCount()).toBe(0);
    });

    test('one unscheduled order results in scheduled production order', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        db.unscheduledProductionOrders.push(new ProductionOrder('so-123', SINGLE_PART_PRODUCT));
        const dept = new PlanningDepartment(config, db);
        const producer = new FakeProducer();

        const decision = dept.planUnscheduledProductionOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(1);
        expect(db.unscheduledProductionOrders).toHaveLength(0);
        expect(db.scheduledProductionOrders).toHaveLength(1);
        expect(producer.messages).toHaveLength(1);
    });


    test('N unscheduled orders results in N scheduled production orders', async () => {
        const config = getTestConfig();
        const db = new CentralDatabase(config);
        for (let i = 0; i < 5; i++) {
            db.unscheduledProductionOrders.push(new ProductionOrder('so-123', SINGLE_PART_PRODUCT));
        }
        const dept = new PlanningDepartment(config, db);
        const producer = new FakeProducer();

        const decision = dept.planUnscheduledProductionOrders();
        await decision.executeAll(db, producer);

        expect(decision.getActionCount()).toBe(5);
        expect(db.unscheduledProductionOrders).toHaveLength(0);
        expect(db.scheduledProductionOrders).toHaveLength(5);
        expect(producer.messages).toHaveLength(5);
    });
});
