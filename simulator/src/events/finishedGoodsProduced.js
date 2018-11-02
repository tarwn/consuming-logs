const BaseEvent = require('./baseEvent');

module.exports = class FinishedGoodsProducedEvent extends BaseEvent {
    constructor(partNumber, quantityProduced, productionOrderNumber) {
        super('FinishedGoodsProduced');
        this.partNumber = partNumber;
        this.quantityProduced = quantityProduced;
        this.productionOrderNumber = productionOrderNumber;
    }
};
