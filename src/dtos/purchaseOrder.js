module.exports = class PurchaseOrder {
    constructor(purchaseOrderNumber, partNumber, quantity, unitPrice) {
        this.purchaseOrderNumber = purchaseOrderNumber;
        this.partNumber = partNumber;
        this.quantity = quantity;
        this.itemPrice = unitPrice;
        this.totalPrice = quantity * unitPrice;

        this._shipTime = -1;
        this._remainingShipTime = -1;
    }

    assignNumber(purchaseOrderNumber) {
        if (this.purchaseOrderNumber != null) {
            throw new Error(`Purchase order ${this.purchaseOrderNumber} cannot be assigned a new purchase order number ${purchaseOrderNumber}`);
        }
        this.purchaseOrderNumber = purchaseOrderNumber;
    }

    assignShippingTime(shipTime) {
        this._shipTime = shipTime;
        this._remainingShipTime = shipTime;
    }

    decrementShipTime() {
        this._remainingShipTime = this._remainingShipTime - 1;
    }

    hasOrderArrived() {
        return this._shipTime > -1 &&
            this._remainingShipTime <= 0;
    }
};
