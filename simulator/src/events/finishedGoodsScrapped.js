const BaseEvent = require('./baseEvent');

module.exports = class FinishedGoodsScrappedEvent extends BaseEvent {
    constructor(partNumber, quantityScrapped) {
        super('FinishedGoodsScrapped');
        this.partNumber = partNumber;
        this.quantityScrapped = quantityScrapped;
    }
};
