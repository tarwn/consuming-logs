const ProductionOrderPlannedEvent = require('../events/productionOrderPlanned');

module.exports = class PlanningDepartment {
    constructor(plantConfig, centralDatabase) {
        this._config = plantConfig;
        this._centralDatabase = centralDatabase;
    }

    planUnscheduledProductionOrders() {
        return this._centralDatabase.unscheduledProductionOrders.map((order) => {
            return PlanningDepartment._planOrdersAction(order);
        });
    }

    static _planOrdersAction(productionOrder) {
        return (db, producer) => {
            db.planProductionOrder(productionOrder);
            return producer.publish(new ProductionOrderPlannedEvent(productionOrder));
        };
    }
};
