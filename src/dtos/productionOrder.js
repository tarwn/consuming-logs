module.exports = class ProductionOrder {
    constructor(finishedPartNumber, quantity) {
        this.finishedPartNumber = finishedPartNumber;
        this.orderQuantity = quantity;
        this.completedQuantity = 0;
    }
};
