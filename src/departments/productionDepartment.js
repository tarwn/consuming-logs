const DepartmentDecision = require('../departmentDecision');
const FinishedGoodsInventoryUpdatedEvent = require('../events/finishedGoodsInventoryUpdated');
const FinishedGoodsProducedEvent = require('../events/finishedGoodsProduced');
const FinishedGoodsScrappedEvent = require('../events/finishedGoodsScrapped');
const ProductionOrderCompletedEvent = require('../events/productionOrderCompleted');

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
                const qtyScrapped = Math.round(maxToProduce
                    * this._config.productionScrapPercentage);
                const qtyProduced = maxToProduce - qtyScrapped;

                if (qtyProduced > 0) {
                    const {
                        totalInventory,
                        isComplete,
                        order
                    } = db.produceFinishedGoods(o.productionOrderNumber, o.partNumber, qtyProduced);

                    producer.publish(new FinishedGoodsProducedEvent(
                        o.partNumber,
                        qtyProduced,
                        o.productionOrderNumber
                    ));
                    producer.publish(new FinishedGoodsInventoryUpdatedEvent(
                        o.partNumber,
                        qtyProduced,
                        totalInventory,
                        o.productionOrderNumber,
                        o.completedQuantity
                    ));

                    if (isComplete) {
                        producer.publish(new ProductionOrderCompletedEvent(order));
                    }
                }

                if (qtyScrapped > 0) {
                    db.scrapFinishedGoods(qtyScrapped);
                    producer.publish(new FinishedGoodsScrappedEvent(
                        o.partNumber,
                        qtyScrapped,
                        o.productionOrderNumber
                    ));
                }
            };
        });
        return new DepartmentDecision(actions);
    }
};
