const ProductionOrderPlannedEvent = require('../events/productionOrderPlanned');
const DepartmentDecision = require('../departmentDecision');

module.exports = class PlanningDepartment {
    constructor(plantConfig, centralDatabase) {
        this._config = plantConfig;
        this._centralDatabase = centralDatabase;
    }

    planUnscheduledProductionOrders() {
        const actions = this._centralDatabase.unscheduledProductionOrders.map((order) => {
            return (db, producer) => {
                db.planProductionOrder(order);
                return producer.publish(new ProductionOrderPlannedEvent(order));
            };
        });
        return new DepartmentDecision(actions);
    }
};
