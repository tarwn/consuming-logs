const BaseEvent = require('./baseEvent');

module.exports = class ProductionOrderPlannedEvent extends BaseEvent {
    constructor(salesOrder) {
        super('ProductionOrderPlanned');
        this.salesOrder = salesOrder;
    }
};
