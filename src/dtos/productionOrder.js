module.exports = class ProductionOrder {
    constructor(salesOrderNumber, partNumber, orderQuantity) {
        this.salesOrderNumber = salesOrderNumber;
        this.productionOrderNumber = null;
        this.partNumber = partNumber;
        this.orderQuantity = orderQuantity;
        this.completedQuantity = 0;
    }

    assignNumber(productionOrderNumber) {
        if (this.productionOrderNumber != null) {
            throw new Error(`Production order ${this.productionOrderNumber} cannot be assigned a new production order number ${productionOrderNumber}`);
        }
        this.productionOrderNumber = productionOrderNumber;
    }
};
