const BaseEvent = require('./baseEvent');

module.exports = class PartsInventoryConsumedEvent extends BaseEvent {
    constructor(partNumber, quantity, totalRemainingQuantity, productionOrder) {
        super('PartsInventoryConsumed');
        this.partNumber = partNumber;
        this.quantity = quantity;
        this.totalRemainingQuantity = totalRemainingQuantity;
        this.productionOrder = productionOrder;
    }
};
