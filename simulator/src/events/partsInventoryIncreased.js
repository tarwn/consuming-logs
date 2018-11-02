const BaseEvent = require('./baseEvent');

module.exports = class PartsInventoryIncreasedEvent extends BaseEvent {
    constructor(partNumber, newQuantity, totalQuantity) {
        super('PartsInventoryIncreased');
        this.partNumber = partNumber;
        this.newQuantity = newQuantity;
        this.totalQuantity = totalQuantity;
    }
};
