const CentralDatabase = require('../src/centralDatabase');
const ProductionOrder = require('../src/dtos/productionOrder');
const PlantConfig = require('../src/plantConfig');

describe('available production schedule', () => {
    test('nothing scheduled or unscheduled: all capacity available', () => {
        const db = new CentralDatabase(new PlantConfig({
            productionLineCapacity: 10,
            productionLines: 1
        }));

        const availableCapacity = db.getAvailableProductionScheduleCapacity();

        expect(availableCapacity).toBe(db.maximumProductionCapacity);
    });

    test('half scheduled , no unscheduled: half capacity available', () => {
        const db = new CentralDatabase(new PlantConfig({
            productionLineCapacity: 10,
            productionLines: 1
        }));
        db.scheduledProductionOrders.push(new ProductionOrder('unit-test-1', db.maximumProductionCapacity / 2));

        const availableCapacity = db.getAvailableProductionScheduleCapacity();

        expect(availableCapacity).toBe(db.maximumProductionCapacity / 2);
    });

    test('some scheduled , some unscheduled: remaining capacity available', () => {
        const db = new CentralDatabase(new PlantConfig({
            productionLineCapacity: 10,
            productionLines: 1
        }));
        db.scheduledProductionOrders.push(new ProductionOrder('unit-test-1', 2));
        db.unscheduledProductionOrders.push(new ProductionOrder('unit-test-1', 2));

        const availableCapacity = db.getAvailableProductionScheduleCapacity();

        expect(availableCapacity).toBe(db.maximumProductionCapacity - 4);
    });

    test('no scheduled, half unscheduled: half capacity available', () => {
        const db = new CentralDatabase(new PlantConfig({
            productionLineCapacity: 10,
            productionLines: 1
        }));
        db.unscheduledProductionOrders.push(new ProductionOrder('unit-test-1', db.maximumProductionCapacity / 2));

        const availableCapacity = db.getAvailableProductionScheduleCapacity();

        expect(availableCapacity).toBe(db.maximumProductionCapacity / 2);
    });
});
