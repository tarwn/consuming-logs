const BaseEvent = require('./baseEvent');

module.exports = class SalesOrderPlacedEvent extends BaseEvent {
    constructor(salesOrder) {
        super('SalesOrderPlaced');
        this.salesOrder = salesOrder;
    }
};
