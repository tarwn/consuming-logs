const ProductionOrderPlannedEvent = require('../events/productionOrderPlanned');
const DepartmentDecision = require('../departmentDecision');

module.exports = class PlanningDepartment {
    constructor(plantConfig, centralDatabase) {
        this._config = plantConfig;
        this._centralDatabase = centralDatabase;
    }

    async planUnscheduledProductionOrders() {
        const actions = this._centralDatabase.unscheduledProductionOrders.map((order) => {
            return async (db, producer) => {
                await db.planProductionOrder(order);
                await producer.publish(new ProductionOrderPlannedEvent(order));
            };
        });
        return new DepartmentDecision(actions);
    }
};
