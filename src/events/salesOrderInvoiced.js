const BaseEvent = require('./baseEvent');

module.exports = class SalesOrderInvoicedEvent extends BaseEvent {
    constructor(salesOrder, totalAmountDue) {
        super('SalesOrderInvoiced');
        this.salesOrder = salesOrder;
        this.totalAmountDue = totalAmountDue;
    }
};
