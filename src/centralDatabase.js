module.exports = class CentralDatabase {
    constructor(plantConfig) {
        this.productionLines = plantConfig.productionLines;
        this.maximumProductionLineCapacity = plantConfig.maximumProductionLineCapacity;

        this.financialLedger = [];
        this.partsInventory = {};
        this.finishedInventory = {};
        this.openSalesOrders = [];
        this.closedSalesOrders = [];
        this.openPurchaseOrders = [];
        this.shippedPurchaseOrders = [];
        this.closedSalesOrders = [];
        this.scheduledProductionOrders = [];
        this.unscheduledProductionOrders = [];
        this.closedProductionOrders = [];
        this.productCatalog = [];
        this.partsCatalog = [];
    }

    get maximumProductionCapacity() {
        return this.productionLines * this.maximumProductionLineCapacity;
    }

    getAvailableProductionScheduleCapacity() {
        const calculateUsedCapacity = (total, productionOrder) => {
            return total + (productionOrder.orderQuantity - productionOrder.completedQuantity);
        };

        return this.maximumProductionCapacity -
            this.scheduledProductionOrders.reduce(calculateUsedCapacity, 0) -
            this.unscheduledProductionOrders.reduce(calculateUsedCapacity, 0);
    }
};
