
const PurchaseOrder = require('../dtos/purchaseOrder');
const PurchaseOrderPlacedEvent = require('../events/purchaseOrderPlaced');
const DepartmentDecision = require('../departmentDecision');

module.exports = class PurchasingDepartment {
    constructor(plantConfig, centralDatabase) {
        this._config = plantConfig;
        this._centralDatabase = centralDatabase;
    }

    orderPartsForPlannedOrders() {
        const plannedParts = PurchasingDepartment._calculateNecessaryParts(
            this._centralDatabase.scheduledProductionOrders,
            this._centralDatabase.productCatalog
        );

        const partsToOrder = PurchasingDepartment._calculatePartsDeficit(
            plannedParts,
            this._centralDatabase.partsInventory,
            this._centralDatabase.openPurchaseOrders
        );

        const actions = partsToOrder.map((part) => {
            const order = PurchasingDepartment._createPurchaseOrder(
                part.partNumber,
                part.quantity,
                this._centralDatabase.partsCatalog
            );

            return (db, producer) => {
                db.placePurchaseOrder(order);
                return producer.publish(new PurchaseOrderPlacedEvent(order));
            };
        });
        return new DepartmentDecision(actions);
    }

    payForReceivedPurchaseOrders() {
        return DepartmentDecision.noAction();
    }

    billForShippedSalesOrders() {
        return DepartmentDecision.noAction();
    }

    static _calculateNecessaryParts(productionOrders, productCatalog) {
        const necessaryParts = {};
        productionOrders.forEach((po) => {
            const numberRemaining = po.orderQuantity - po.completedQuantity;
            const product = productCatalog.find((p) => {
                return p.partNumber === po.partNumber;
            });
            if (product == null) {
                throw new Error(`Product Catalog entry not found for product '${po.partNumber}' when calculating BOM requirements`);
            }

            // assume the product is found, closed system
            const rawParts = Object.keys(product.bom.ingredients);
            rawParts.forEach((part) => {
                if (necessaryParts[part] === undefined) {
                    necessaryParts[part] = (product.bom.ingredients[part] * numberRemaining);
                }
                else {
                    necessaryParts[part] += (product.bom.ingredients[part] * numberRemaining);
                }
            });
        });
        return necessaryParts;
    }

    static _calculatePartsDeficit(partsNeeded, currentInventory, openPurchaseOrders) {
        // calculate parts needed minus relevant open purchase orders
        const partsNeededMinusInFlight = {};
        Object.keys(partsNeeded).forEach((partNumber) => {
            partsNeededMinusInFlight[partNumber] = partsNeeded[partNumber];
        });

        openPurchaseOrders.forEach((o) => {
            if (partsNeededMinusInFlight[o.partNumber]) {
                partsNeededMinusInFlight[o.partNumber] -= o.quantity;
            }
        });

        // final list of new orders needed
        const partsToOrder = [];
        Object.keys(partsNeededMinusInFlight).forEach((part) => {
            const currentInventoryLevel = (currentInventory[part] || 0);
            if (partsNeededMinusInFlight[part] > currentInventoryLevel) {
                partsToOrder.push({
                    partNumber: part,
                    quantity: partsNeededMinusInFlight[part] - currentInventoryLevel
                });
            }
        });
        return partsToOrder;
    }

    static _createPurchaseOrder(partNumber, quantity, partsCatalog) {
        const catalogEntry = partsCatalog.find(entry => entry.partNumber === partNumber);
        if (catalogEntry == null) {
            throw new Error(`Parts Catalog entry not found for part '${partNumber}' when looking up price for Purchase Order`);
        }

        const bestPrice = catalogEntry.getBestPriceQuote();
        return new PurchaseOrder(null, partNumber, quantity, bestPrice.price);
    }
};
