const BaseEvent = require('./baseEvent');

module.exports = class FinishedGoodsInventoryUpdatedEvent extends BaseEvent {
    constructor(partNumber, quantityProduced, inventoryTotal, productionOrderNumber, orderTotal) {
        super('FinishedGoodsInventoryUpdated');
        this.partNumber = partNumber;
        this.quantityProduced = quantityProduced;
        this.inventoryTotal = inventoryTotal;
        // currently assumes all FG is dedicated to a given order, one of several
        //  simplifications over the real world :)
        this.productionOrderNumber = productionOrderNumber;
        this.orderTotal = orderTotal;
    }
};
