const FinishedGood = require('./dtos/finishedGood');
const FinishedGoodBOM = require('./dtos/finishedGoodBOM');
const RawPart = require('./dtos/rawPart');

module.exports = class CentralDatabase {
    constructor(plantConfig) {
        this.productionLines = plantConfig.productionLines;
        this.productionLineCapacity = plantConfig.productionLineCapacity;

        this.cash = plantConfig.cash || 0;
        this.financialLedger = [];
        this.partsInventory = {};
        this.finishedInventory = {};
        this.openSalesOrders = [];
        this.closedSalesOrders = [];
        this.openPurchaseOrders = [];
        this.unbilledPurchaseOrders = [];
        this.closedPurchaseOrders = [];
        this.scheduledProductionOrders = [];
        this.unscheduledProductionOrders = [];
        this.closedProductionOrders = [];
        this.productCatalog = [];
        this.partsCatalog = [];

        this._seed = `${Math.random() * 10000}-`;
        this._counter = 0;

        plantConfig.productCatalog.forEach((product) => {
            this.productCatalog.push(new FinishedGood(
                product.partNumber,
                product.name,
                new FinishedGoodBOM(product.bom),
                product.unitPrice
            ));
        });

        plantConfig.partsCatalog.forEach((part) => {
            this.partsCatalog.push(new RawPart(
                part.partNumber,
                part.unitPrice
            ));
        });
    }

    toStatusString() {
        return {
            openSalesOrders: this.openSalesOrders.length,
            closedSalesOrders: this.closedSalesOrders.length,
            openPurchaseOrders: this.openPurchaseOrders.length,
            unbilledPurchaseOrders: this.unbilledPurchaseOrders.length,
            closedPurchaseOrders: this.closedSalesOrders.length,
            scheduledProductionOrders: this.scheduledProductionOrders.length,
            unscheduledProductionOrders: this.unscheduledProductionOrders.length,
            closedProductionOrders: this.closedProductionOrders.length
        };
    }

    get maximumProductionCapacity() {
        return this.productionLines * this.productionLineCapacity;
    }

    getAvailableProductionScheduleCapacity() {
        const calculateUsedCapacity = (total, productionOrder) => {
            return total + (productionOrder.orderQuantity - productionOrder.completedQuantity);
        };

        return this.maximumProductionCapacity -
            this.scheduledProductionOrders.reduce(calculateUsedCapacity, 0) -
            this.unscheduledProductionOrders.reduce(calculateUsedCapacity, 0);
    }

    placeSalesOrder(salesOrder) {
        // assign a sales order number
        salesOrder.assignNumber(`so-${this._seed}-${this._counter++}`);
        this.openSalesOrders.push(salesOrder);
        const productionOrder = salesOrder.generateProductionOrder();
        this.unscheduledProductionOrders.push(productionOrder);
    }

    planProductionOrder(productionOrder) {
        const orderIndex = this.unscheduledProductionOrders.findIndex((o) => {
            return o.productionOrderNumber === productionOrder.productionOrderNumber;
        });

        if (orderIndex > -1) {
            this.scheduledProductionOrders.push(productionOrder);
            this.unscheduledProductionOrders.splice(orderIndex, 1);
        }
        else {
            throw new Error(`Specific production order '${productionOrder.productionOrderNumber}' is not in the unscheduled orders`);
        }
    }

    placePurchaseOrder(purchaseOrder) {
        // assign a purchase order number
        purchaseOrder.assignNumber(`purch-${this._seed}-${this._counter++}`);
        purchaseOrder.assignShippingTime(3);
        this.openPurchaseOrders.push(purchaseOrder);
    }

    /* eslint-disable */
    updatePurchaseOrder(purchaseOrder) {
        // assume the order has been modified and references
        //  the same one in the collection and is therefor
        //  already updated
    }
    /* eslint-enable */

    receivePurchaseOrder(purchaseOrder) {
        // shift from open to closed
        const orderIndex = this.openPurchaseOrders.findIndex((o) => {
            return o.purchaseOrderNumber === purchaseOrder.purchaseOrderNumber;
        });

        if (orderIndex > -1) {
            this.closedPurchaseOrders.push(purchaseOrder);
            this.unbilledPurchaseOrders.push(purchaseOrder);
            this.openPurchaseOrders.splice(orderIndex, 1);
        }
        else {
            throw new Error(`Specific production order '${purchaseOrder.purchaseOrderNumber}' is not in the unscheduled orders`);
        }

        // increment inventory
        if (!this.partsInventory[purchaseOrder.partNumber]) {
            this.partsInventory[purchaseOrder.partNumber] = 0;
        }
        this.partsInventory[purchaseOrder.partNumber] += purchaseOrder.quantity;
        return this.partsInventory[purchaseOrder.partNumber];
    }

    payPurchaseOrder(purchaseOrder) {
        const orderIndex = this.unbilledPurchaseOrders.findIndex((o) => {
            return o.purchaseOrderNumber === purchaseOrder.purchaseOrderNumber;
        });

        if (orderIndex > -1) {
            this.unbilledPurchaseOrders.splice(orderIndex, 1);
        }
        else {
            throw new Error(`Specific production order '${purchaseOrder.purchaseOrderNumber}' is not in the unbilled orders`);
        }

        this.financialLedger.push({
            amount: -1 * purchaseOrder.totalPrice,
            type: 'purchaseOrder',
            data: purchaseOrder
        });
        this.cash += -1 * purchaseOrder.totalPrice;
    }
};
