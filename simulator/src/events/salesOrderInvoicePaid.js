const BaseEvent = require('./baseEvent');

module.exports = class SalesOrderInvoicePaidEvent extends BaseEvent {
    constructor(salesOrder, totalAmountReceived) {
        super('SalesOrderInvoicePaid');
        this.salesOrder = salesOrder;
        this.totalAmountReceived = totalAmountReceived;
    }
};
