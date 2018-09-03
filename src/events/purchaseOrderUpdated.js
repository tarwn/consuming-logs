const BaseEvent = require('./baseEvent');

module.exports = class PurchaseOrderUpdatedEvent extends BaseEvent {
    constructor(purchaseOrder) {
        super('PurchaseOrderUpdated');
        this.purchaseOrder = purchaseOrder;
    }
};
