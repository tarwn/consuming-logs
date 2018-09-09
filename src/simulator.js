const CentralDatabase = require('./centralDatabase');
const PlantConfig = require('./plantConfig');
const FinanceDepartment = require('./departments/financeDepartment');
const PlanningDepartment = require('./departments/planningDepartment');
const ProductionDepartment = require('./departments/productionDepartment');
const PurchasingDepartment = require('./departments/purchasingDepartment');
const SalesDepartment = require('./departments/salesDepartment');
const WarehouseDepartment = require('./departments/warehouseDepartment');
const HeartbeatEvent = require('./events/heartbeat');

module.exports = class Simulator {
    constructor(config, producer) {
        this._config = new PlantConfig(config);
        this._database = new CentralDatabase(this._config);

        this._departments = {
            finance: new FinanceDepartment(this._config, this._database),
            planning: new PlanningDepartment(this._config, this._database),
            production: new ProductionDepartment(this._config, this._database),
            purchasing: new PurchasingDepartment(this._config, this._database),
            sales: new SalesDepartment(this._config, this._database),
            warehouse: new WarehouseDepartment(this._config, this._database)
        };

        this._producer = producer;
        this._intervalCount = 0;
    }

    runInterval() {
        return Promise.resolve()
            .then(() => this._runInterval());
    }

    _runInterval() {
        if (this._intervalIsRunning) {
            console.log(`Skipped a runInterval, processing is running behind: ${this._intervalCount}`);
            return Promise.resolve();
        }
        this._intervalIsRunning = true;
        this._intervalCount++;

        return Promise.resolve()
            .then(() => {
                const actions = this._executeBusinessDecisions();

                if (this._intervalCount % 10 === 0) {
                    actions.push(this._producer.publish(new HeartbeatEvent(Date.now())));
                }

                return Promise.all(actions);
            })
            .then(() => {
                this._intervalIsRunning = false;
            })
            .catch((err) => {
                this._intervalIsRunning = false;
                throw err;
            });
    }

    _executeBusinessDecisions() {
        const {
            sales,
            planning,
            purchasing,
            warehouse,
            finance,
            production
        } = this._departments;

        // decisions return un-executed actions (that return promises)
        //  everyone looks at the database at the beginning of the turn to decide what to do,
        //  then once everyone has decided on their actions we'll run through and execute them
        //  as promises
        const decisions = [
            sales.generateOrdersIfCapacityIsAvailable(),
            planning.planUnscheduledProductionOrders(),
            purchasing.orderPartsForPlannedOrders(),
            warehouse.receivePurchasedParts(),
            finance.payForReceivedPurchaseOrders(),
            production.runPlannedProductionOrders(),
            warehouse.shipCompletedSalesOrders(),
            finance.billForShippedSalesOrders(),
            warehouse.stopTrackingDeliveredSalesOrders(),
            warehouse.updateTrackingForInTransitShipments()
        ];

        return decisions.map(d => d.executeAll(this._database, this._producer));
    }
};
