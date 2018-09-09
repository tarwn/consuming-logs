module.exports = class Shipment {
    constructor(shipmentNumber, orderType, orderNumber, partNumber, quantity) {
        this.shipmentNumber = shipmentNumber;
        this.orderType = orderType;
        this.orderNumber = orderNumber;
        this.partNumber = partNumber;
        this.quantity = quantity;

        this._shipTime = -1;
        this._remainingShipTime = -1;
    }

    assignNumber(shipmentNumber) {
        if (this.purchaseOrderNumber != null) {
            throw new Error(`Shipment ${this.shipmentNumber} cannot be assigned a new shipment number ${shipmentNumber}`);
        }
        this.shipmentNumber = shipmentNumber;
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
