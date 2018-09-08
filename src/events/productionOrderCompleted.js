const BaseEvent = require('./baseEvent');

module.exports = class ProductionOrderCompletedEvent extends BaseEvent {
    constructor(productionOrder) {
        super('ProductionOrderCompleted');
        this.productionOrder = productionOrder;
    }
};
