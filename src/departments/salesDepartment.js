const SalesOrder = require('../dtos/salesOrder');
const SalesOrderPlacedEvent = require('../events/salesOrderPlaced');
const DepartmentDecision = require('../departmentDecision');

module.exports = class SalesDepartment {
    constructor(plantConfig, centralDatabase) {
        this._config = plantConfig;
        this._centralDatabase = centralDatabase;
    }

    generateOrdersIfCapacityIsAvailable() {
        let availableCapacity = this._centralDatabase.getAvailableProductionScheduleCapacity();
        const availableProducts = this._centralDatabase.productCatalog.map(p => p.partNumber);

        const potentialOrders = [];
        while (availableCapacity >= this._config.minimumOrderSize) {
            const newOrder = SalesDepartment._generateNewOrder(
                this._config,
                availableCapacity,
                availableProducts
            );
            availableCapacity -= newOrder.orderQuantity;
            potentialOrders.push(newOrder);
        }

        const actions = potentialOrders.map((salesOrder) => {
            return (db, producer) => {
                db.placeSalesOrder(salesOrder);
                return producer.publish(new SalesOrderPlacedEvent(salesOrder));
            };
        });
        return new DepartmentDecision(actions);
    }

    static _generateNewOrder(plantConfig, availableCapacity, availableProducts) {
        const quantity = plantConfig.minimumOrderSize;
        const partNumber = availableProducts[0];
        return new SalesOrder(null, partNumber, quantity);
    }
};
