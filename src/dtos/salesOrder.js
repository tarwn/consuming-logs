const ProductionOrder = require('./productionOrder');

module.exports = class SalesOrder {
    constructor(salesOrderNumber, partNumber, orderQuantity, itemPrice) {
        this.salesOrderNumber = salesOrderNumber;
        this.partNumber = partNumber;
        this.orderQuantity = orderQuantity;
        this.itemPrice = itemPrice;
    }

    assignNumber(salesOrderNumber) {
        if (this.salesOrderNumber != null) {
            throw new Error(`Sales order ${this.salesOrderNumber} cannot be assigned a new sales order number ${salesOrderNumber}`);
        }
        this.salesOrderNumber = salesOrderNumber;
    }

    generateProductionOrder() {
        const productionOrder = new ProductionOrder(
            this.salesOrderNumber,
            this.partNumber,
            this.orderQuantity
        );
        productionOrder.assignNumber(`${this.salesOrderNumber}-production`);
        return productionOrder;
    }
};
