const BaseEvent = require('./baseEvent');

module.exports = class ProductionIdleEvent extends BaseEvent {
    constructor(purchaseOrderNumber) {
        super('ProductionIdle');
        this.purchaseOrderNumber = purchaseOrderNumber;
    }
};
