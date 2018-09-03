const BaseEvent = require('./baseEvent');

module.exports = class PurchaseOrderPlacedEvent extends BaseEvent {
    constructor(purchaseOrder) {
        super('PurchaseOrderPlaced');
        this.purchaseOrder = purchaseOrder;
    }
};
