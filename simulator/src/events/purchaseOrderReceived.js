const BaseEvent = require('./baseEvent');

module.exports = class PurchaseOrderReceivedEvent extends BaseEvent {
    constructor(purchaseOrder) {
        super('PurchaseOrderReceived');
        this.purchaseOrder = purchaseOrder;
    }
};
