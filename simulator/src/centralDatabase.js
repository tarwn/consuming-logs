const FinishedGood = require('./dtos/finishedGood');
const FinishedGoodBOM = require('./dtos/finishedGoodBOM');
const RawPart = require('./dtos/rawPart');

module.exports = class CentralDatabase {
    constructor(plantConfig) {
        if (!plantConfig.isValid) {
            throw new Error(`Configuration is not valid: ${plantConfig.validationErrors.join(',')}`);
        }

        this.productionLines = plantConfig.productionLines;
        this.productionCapacityPerInterval = plantConfig.productionCapacityPerInterval;
        this.maximumIntervalsToSchedule = plantConfig.maximumIntervalsToSchedule;

        this.cash = plantConfig.cash || 0;
        this.financialLedger = [];
        this.partsInventory = {};
        this.finishedInventory = {};
        this.scrappedInventory = {};
        this.openSalesOrders = [];
        this.shippedSalesOrders = [];
        this.closedSalesOrders = [];
        this.openPurchaseOrders = [];
        this.unbilledPurchaseOrders = [];
        this.closedPurchaseOrders = [];
        this.scheduledProductionOrders = [];
        this.unscheduledProductionOrders = [];
        this.closedProductionOrders = [];
        this.productCatalog = [];
        this.partsCatalog = [];
        this.trackedShipments = [];
        this.shippingHistory = [];

        this.version = '';

        this._seed = `${Math.floor(Math.random() * 10000)}-`;
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

    initialize() {
        this._noop = 'noop';
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
        return this.productionLines * this.productionCapacityPerInterval *
            this.maximumIntervalsToSchedule;
    }

    getAvailableProductionScheduleCapacity() {
        const calculateUsedCapacity = (total, productionOrder) => {
            return total + (productionOrder.orderQuantity - productionOrder.completedQuantity);
        };

        // how do you know a thing breaks frequently despite tests? yeah...
        // console.log({
        //     maximumProductionCapacity: this.maximumProductionCapacity,
        //     scheduled: this.scheduledProductionOrders.reduce(calculateUsedCapacity, 0),
        //     unscheduled: this.unscheduledProductionOrders
        // });

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
        this.openPurchaseOrders.push(purchaseOrder);
    }

    trackPurchaseOrderShipment(shipment) {
        shipment.assignNumber(`ship-${this._seed}-${this._counter++}`);
        shipment.assignShippingTime(3);
        this.trackedShipments.push(shipment);
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
            type: 'PurchaseOrder',
            data: purchaseOrder
        });
        this.cash += -1 * purchaseOrder.totalPrice;
    }

    consumeParts(partNumber, quantity) {
        if (!this.partsInventory[partNumber]) {
            throw new Error(`Part ${partNumber} is not in inventory`);
        }

        if (this.partsInventory[partNumber] < quantity) {
            throw new Error(`Part ${partNumber} cannot be consumed, insufficient quantity on hand: on hand = ${this.partsInventory[partNumber]}, consumed amt = ${quantity}`);
        }

        this.partsInventory[partNumber] -= quantity;
        return {
            totalRemaining: this.partsInventory[partNumber]
        };
    }

    produceFinishedGoods(productionOrderNumber, partNumber, quantity) {
        const order = this.scheduledProductionOrders
            .find(o => o.productionOrderNumber === productionOrderNumber);

        if (order == null) {
            throw new Error(`Production order ${productionOrderNumber} cannot be produced against because it is not scheduled`);
        }

        if (order.partNumber !== partNumber) {
            throw new Error(`Production order ${productionOrderNumber} expected ${order.partNumber} but you produced ${quantity} of ${partNumber}`);
        }

        order.increaseCompletedQuantity(quantity);

        // may split these into two department actions?
        this.storeFinishedGoods(order.partNumber, quantity);

        return {
            totalInventory: this.finishedInventory[order.partNumber],
            order,
            isComplete: order.isComplete
        };
    }

    storeFinishedGoods(partNumber, quantity) {
        if (!this.finishedInventory[partNumber]) {
            this.finishedInventory[partNumber] = 0;
        }
        this.finishedInventory[partNumber] += quantity;
    }

    scrapFinishedGoods(partNumber, quantity) {
        if (!this.scrappedInventory[partNumber]) {
            this.scrappedInventory[partNumber] = 0;
        }
        this.scrappedInventory[partNumber] += quantity;
    }

    stageProductionOrderToShip(productionOrderNumber) {
        const orderIndex = this.scheduledProductionOrders.findIndex((o) => {
            return o.productionOrderNumber === productionOrderNumber;
        });

        if (orderIndex > -1) {
            this.closedProductionOrders.push(this.scheduledProductionOrders[orderIndex]);
            this.scheduledProductionOrders.splice(orderIndex, 1);
        }
        else {
            throw new Error(`Specific production order '${productionOrderNumber}' is not in the scheduled orders`);
        }
    }

    indicateSalesOrderHasShipped(salesOrderNumber) {
        const orderIndex = this.openSalesOrders.findIndex((o) => {
            return o.salesOrderNumber === salesOrderNumber;
        });

        if (orderIndex > -1) {
            this.shippedSalesOrders.push(this.openSalesOrders[orderIndex]);
            this.openSalesOrders.splice(orderIndex, 1);
        }
        else {
            throw new Error(`Specific sales order '${salesOrderNumber}' is not in the open sales orders`);
        }
    }

    shipShipment(shipment) {
        shipment.assignNumber(`ship-${this._seed}-${this._counter++}`);
        shipment.assignShippingTime(3);
        this.trackedShipments.push(shipment);
    }

    /* eslint-disable */
    updateTrackedShipment(shipment) {
        // assume the shipment has been modified and references
        //  the same one in the collection and is therefore
        //  already updated
    }
    /* eslint-enable */

    stopTrackingShipment(shipmentNumber) {
        const orderIndex = this.trackedShipments.findIndex((s) => {
            return s.shipmentNumber === shipmentNumber;
        });

        if (orderIndex > -1) {
            this.shippingHistory.push(this.trackedShipments[orderIndex]);
            this.trackedShipments.splice(orderIndex, 1);
        }
        else {
            throw new Error(`Specific shipment '${shipmentNumber}' is not in the tracked shipments`);
        }
    }

    invoiceForSalesOrder(salesOrderNumber) {
        const orderIndex = this.shippedSalesOrders.findIndex((o) => {
            return o.salesOrderNumber === salesOrderNumber;
        });

        if (orderIndex > -1) {
            this.closedSalesOrders.push(this.shippedSalesOrders[orderIndex]);
            this.shippedSalesOrders.splice(orderIndex, 1);
        }
        else {
            throw new Error(`Specific sales order '${salesOrderNumber}' is not in the open sales orders`);
        }
    }

    receivePaymentForSalesOrder(salesOrder, amount) {
        this.financialLedger.push({
            amount,
            type: 'SalesOrder',
            data: salesOrder
        });
        this.cash += amount;
    }

    setVersion(version) {
        this.version = version;
    }
};
