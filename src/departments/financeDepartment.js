
const PurchaseOrderPaidEvent = require('../events/purchaseOrderPaid');
const DepartmentDecision = require('../departmentDecision');

module.exports = class FinanceDepartment {
    constructor(plantConfig, centralDatabase) {
        this._config = plantConfig;
        this._centralDatabase = centralDatabase;
    }

    payForReceivedPurchaseOrders() {
        const actions = this._centralDatabase.unbilledPurchaseOrders.map((po) => {
            return (db, producer) => {
                db.payPurchaseOrder(po);
                return producer.publish(new PurchaseOrderPaidEvent(po, po.totalPrice));
            };
        });
        return new DepartmentDecision(actions);
    }

    billForShippedSalesOrders() {
        return DepartmentDecision.noAction();
    }
};
