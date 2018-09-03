const CentralDatabase = require('./centralDatabase');
const PlantConfig = require('./plantConfig');
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

        return this._buildInterval()
            .then((actions) => {
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

    _buildInterval() {
        return new Promise((resolve, reject) => {
            try {
                const actions = [];
                if (this._intervalCount % 10 === 0) {
                    actions.push(this._producer.publish(new HeartbeatEvent(Date.now())));
                }

                const businessActions = this._calculateBusinessDecisions();
                businessActions.forEach(a => actions.push(a));

                resolve(actions);
            }
            catch (err) {
                reject(err);
            }
        });
    }

    _calculateBusinessDecisions() {
        const {
            sales,
            planning,
            purchasing,
            warehouse,
            production
        } = this._departments;

        // decisions return un-executed actions (that return promises)
        //  everyone looks at the database at the beginning of the turn to decide what to do,
        //  then once everyone has decided on their actions we'll run through and execute them
        //  all pass them back for the resulting promises to be waited on
        const decisions = [
            sales.generateOrdersIfCapacityIsAvailable(),
            planning.planUnscheduledProductionOrders(),
            purchasing.orderPartsForPlannedOrders(),
            warehouse.receivePurchasedParts(),
            purchasing.payForReceivedPurchaseOrders(),
            production.runPlannedProductionOrders(),
            warehouse.shipCompletedSalesOrders(),
            purchasing.billForShippedSalesOrders(),
            warehouse.updatePendingPurchaseOrders()
        ];

        function flatten(arr) {
            // flatten and then misuse filter to empty null items
            return arr.reduce((acc, val) => acc.concat(val), [])
                .filter(f => f);
        }

        // start executing the decisions, return array of promises
        return flatten(decisions)
            .map(d => d(this._database, this._producer));
    }
};
