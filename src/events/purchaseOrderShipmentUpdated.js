const BaseEvent = require('./baseEvent');

module.exports = class PurchaseOrderShipmentUpdatedEvent extends BaseEvent {
    constructor(purchaseOrder) {
        super('PurchaseOrderShipmentUpdated');
        this.purchaseOrder = purchaseOrder;
    }
};
