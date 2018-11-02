module.exports = class PurchaseOrder {
    constructor(purchaseOrderNumber, partNumber, quantity, unitPrice) {
        this.purchaseOrderNumber = purchaseOrderNumber;
        this.partNumber = partNumber;
        this.quantity = quantity;
        this.itemPrice = unitPrice;
        this.totalPrice = quantity * unitPrice;
    }

    assignNumber(purchaseOrderNumber) {
        if (this.purchaseOrderNumber != null) {
            throw new Error(`Purchase order ${this.purchaseOrderNumber} cannot be assigned a new purchase order number ${purchaseOrderNumber}`);
        }
        this.purchaseOrderNumber = purchaseOrderNumber;
    }
};
