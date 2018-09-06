const DepartmentDecision = require('../departmentDecision');

module.exports = class ProductionDepartment {
    constructor(plantConfig, centralDatabase) {
        this._config = plantConfig;
        this._centralDatabase = centralDatabase;
    }

    runPlannedProductionOrders() {
        return DepartmentDecision.noAction();
    }
};
