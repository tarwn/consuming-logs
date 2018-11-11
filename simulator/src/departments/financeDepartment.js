
const PurchaseOrderPaidEvent = require('../events/purchaseOrderPaid');
const DepartmentDecision = require('../departmentDecision');
const SalesOrderInvoicedEvent = require('../events/salesOrderInvoiced');
const SalesOrderInvoicePaidEvent = require('../events/salesOrderInvoicePaid');

module.exports = class FinanceDepartment {
    constructor(plantConfig, centralDatabase) {
        this._config = plantConfig;
        this._centralDatabase = centralDatabase;
    }

    async payForReceivedPurchaseOrders() {
        const actions = this._centralDatabase.unbilledPurchaseOrders.map((po) => {
            return async (db, producer) => {
                await db.payPurchaseOrder(po);
                await producer.publish(new PurchaseOrderPaidEvent(po, po.totalPrice));
            };
        });
        return new DepartmentDecision(actions);
    }

    async billForShippedSalesOrders() {
        const actions = this._centralDatabase.shippedSalesOrders.map((so) => {
            return async (db, producer) => {
                await db.invoiceForSalesOrder(so.salesOrderNumber);
                await db.receivePaymentForSalesOrder(so, so.getTotalAmountDue());
                await producer.publish([
                    new SalesOrderInvoicedEvent(so, so.getTotalAmountDue()),
                    new SalesOrderInvoicePaidEvent(so, so.getTotalAmountDue())
                ]);
            };
        });
        return new DepartmentDecision(actions);
    }
};
