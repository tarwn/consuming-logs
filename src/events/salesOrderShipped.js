const BaseEvent = require('./baseEvent');

module.exports = class SalesOrderShippedEvent extends BaseEvent {
    constructor(shipment, salesOrder) {
        super('SalesOrderShipped');
        this.shipment = shipment;
        this.salesOrder = salesOrder;
    }
};
