const PartsInventoryIncreasedEvent = require('../events/partsInventoryIncreased');
const PurchaseOrderReceivedEvent = require('../events/purchaseOrderReceived');
const PurchaseOrderShipmentUpdatedEvent = require('../events/purchaseOrderShipmentUpdated');
const DepartmentDecision = require('../departmentDecision');

module.exports = class WarehouseDepartment {
    constructor(plantConfig, centralDatabase) {
        this._config = plantConfig;
        this._centralDatabase = centralDatabase;
    }

    receivePurchasedParts() {
        const actions = this._centralDatabase.openPurchaseOrders
            .filter(po => po.hasOrderArrived())
            .map((po) => {
                return (db, producer) => {
                    const newTotal = db.receivePurchaseOrder(po);
                    return producer.publish([
                        new PurchaseOrderReceivedEvent(po),
                        new PartsInventoryIncreasedEvent(po.partNumber, po.quantity, newTotal)
                    ]);
                };
            });
        return new DepartmentDecision(actions);
    }

    shipCompletedSalesOrders() {
        return DepartmentDecision.noAction();
    }

    updatePendingPurchaseOrders() {
        const actions = this._centralDatabase.openPurchaseOrders
            .filter(po => !po.hasOrderArrived())
            .map((po) => {
                return (db, producer) => {
                    po.decrementShipTime();
                    db.updatePurchaseOrder(po);
                    return producer.publish(new PurchaseOrderShipmentUpdatedEvent(po));
                };
            });
        return new DepartmentDecision(actions);
    }
};
