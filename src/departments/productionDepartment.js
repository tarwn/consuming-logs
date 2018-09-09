const DepartmentDecision = require('../departmentDecision');
const FinishedGoodsInventoryUpdatedEvent = require('../events/finishedGoodsInventoryUpdated');
const FinishedGoodsProducedEvent = require('../events/finishedGoodsProduced');
const FinishedGoodsScrappedEvent = require('../events/finishedGoodsScrapped');
const ProductionOrderCompletedEvent = require('../events/productionOrderCompleted');
const ProductionIdleEvent = require('../events/productionIdle');
const PartsInventoryConsumedEvent = require('../events/partsInventoryConsumed');

module.exports = class ProductionDepartment {
    constructor(plantConfig, centralDatabase) {
        this._config = plantConfig;
        this._centralDatabase = centralDatabase;
    }

    runPlannedProductionOrders() {
        const ordersToRun = this._centralDatabase.scheduledProductionOrders
            .slice(0, this._config.productionLines);

        const actions = ordersToRun.map((o) => {
            return (db, producer) => {
                const maxToProduce = Math.min(
                    o.getRemainingQuantity(),
                    this._config.productionCapacityPerInterval
                );

                const { bom } = this._centralDatabase.productCatalog
                    .find(fg => fg.partNumber === o.partNumber);

                if (!bom) {
                    throw new Error(`Finished Good ${o.partNumber} does not have a productCatalog entry`);
                }

                const maxFromRawParts = Object.keys(bom.ingredients).reduce((_, p) => {
                    const maxFromParts = (this._centralDatabase.partsInventory[p] || 0)
                        / bom.ingredients[p];
                    return Math.min(maxToProduce, maxFromParts);
                }, maxToProduce);

                if (maxFromRawParts > 0) {
                    return this._produce(maxFromRawParts, o, bom, db, producer);
                }
                else {
                    return producer.publish(new ProductionIdleEvent(o.purchaseOrderNumber));
                }
            };
        });
        return new DepartmentDecision(actions);
    }

    _produce(quantity, o, bom, db, producer) {
        const qtyScrapped = Math.round(quantity
            * this._config.productionScrapPercentage);
        const qtyProduced = quantity - qtyScrapped;

        const events = [];

        // consume input
        Object.keys(bom.ingredients).forEach((i) => {
            const { totalRemaining } = db.consumeParts(i, quantity * bom.ingredients[i]);
            events.push(new PartsInventoryConsumedEvent(
                i,
                quantity * bom.ingredients[i],
                totalRemaining,
                o.productionOrderNumber
            ));
        });

        // produce output
        if (qtyProduced > 0) {
            const {
                totalInventory,
                isComplete,
                order
            } = db.produceFinishedGoods(o.productionOrderNumber, o.partNumber, qtyProduced);

            events.push(new FinishedGoodsProducedEvent(
                o.partNumber,
                qtyProduced,
                o.productionOrderNumber
            ));
            events.push(new FinishedGoodsInventoryUpdatedEvent(
                o.partNumber,
                qtyProduced,
                totalInventory,
                o.productionOrderNumber,
                o.completedQuantity
            ));

            if (isComplete) {
                events.push(new ProductionOrderCompletedEvent(order));
            }
        }

        if (qtyScrapped > 0) {
            db.scrapFinishedGoods(qtyScrapped);
            events.push(new FinishedGoodsScrappedEvent(
                o.partNumber,
                qtyScrapped,
                o.productionOrderNumber
            ));
        }

        return producer.publish(events);
    }
};
