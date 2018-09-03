const PartsInventoryIncreasedEvent = require('../events/partsInventoryIncreased');
const PurchaseOrderReceivedEvent = require('../events/purchaseOrderReceived');
const PurchaseOrderUpdatedEvent = require('../events/purchaseOrderUpdated');


module.exports = class WarehouseDepartment {
    constructor(plantConfig, centralDatabase) {
        this._config = plantConfig;
        this._centralDatabase = centralDatabase;
    }

    receivePurchasedParts() {
        return this._centralDatabase.openPurchaseOrders.map((po) => {
            if (!po.hasOrderArrived()) {
                return null;
            }
            else {
                return WarehouseDepartment._receivePurchaseOrderAction(po);
            }
        });
    }

    static _receivePurchaseOrderAction(purchaseOrder) {
        return (db, producer) => {
            const newTotal = db.receivePurchaseOrder(purchaseOrder);
            return producer.publish([
                new PurchaseOrderReceivedEvent(purchaseOrder),
                new PartsInventoryIncreasedEvent(purchaseOrder.partNumber, purchaseOrder.quantity, newTotal)
            ]);
        };
    }

    shipCompletedSalesOrders() {
        return [];
    }

    updatePendingPurchaseOrders() {
        return this._centralDatabase.openPurchaseOrders.map((po) => {
            if (!po.hasOrderArrived()) {
                return WarehouseDepartment._updatePurchaseOrderAction(po);
            }
            else {
                return null;
            }
        });
    }

    static _updatePurchaseOrderAction(purchaseOrder) {
        return (db, producer) => {
            purchaseOrder.decrementShipTime();
            db.updatePurchaseOrder(purchaseOrder);
            return producer.publish(new PurchaseOrderUpdatedEvent(purchaseOrder));
        };
    }
};
