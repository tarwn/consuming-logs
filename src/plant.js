module.exports = class Plant {
    constructor(config, publisher) {
        this._database = {
            orders: [],
            inventory: {},
            balanceSheet: [],
            balance: 0
        };
        this._publisher = publisher;
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
                    actions.push(this._publisher.publish({ type: 'heartbeat', action: 'alive', date: Date.now() }));
                }

                // - warehouse
                // inventory arrives
                this._database.orders.forEach((o) => {
                    if (!this._database.inventory[o.product]) {
                        this._database.inventory[o.product] = 0;
                    }
                    this._database.inventory[o.product] += o.amount;
                    this._database.balanceSheet.push({ type: 'order', amount: -1 * o.price, value: o });
                    this._database.balance += -1 * o.price;
                });

                // purchase orders are placed to top off inventory
                // customer orders are filled

                // - ecommerce
                // customer orders are placed
                // customers are charged

                // - vendors
                //

                resolve(actions);
            }
            catch (err) {
                reject(err);
            }
        });
    }
};
