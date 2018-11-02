const BaseEvent = require('./baseEvent');

module.exports = class PurchaseOrderPlacedEvent extends BaseEvent {
    constructor(purchaseOrder, shipment) {
        super('PurchaseOrderPlaced');
        this.purchaseOrder = purchaseOrder;
        this.shipment = shipment;
    }
};
