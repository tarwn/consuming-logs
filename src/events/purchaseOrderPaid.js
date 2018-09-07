const BaseEvent = require('./baseEvent');

module.exports = class PurchaseOrderPaidEvent extends BaseEvent {
    constructor(purchaseOrder, totalAmountPaid) {
        super('PurchaseOrderPaid');
        this.purchaseOrder = purchaseOrder;
        this.totalAmountPaid = totalAmountPaid;
    }
};
