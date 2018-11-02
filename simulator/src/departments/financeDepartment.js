
const PurchaseOrderPaidEvent = require('../events/purchaseOrderPaid');
const DepartmentDecision = require('../departmentDecision');
const SalesOrderInvoicedEvent = require('../events/salesOrderInvoiced');
const SalesOrderInvoicePaidEvent = require('../events/salesOrderInvoicePaid');

module.exports = class FinanceDepartment {
    constructor(plantConfig, centralDatabase) {
        this._config = plantConfig;
        this._centralDatabase = centralDatabase;
    }

    payForReceivedPurchaseOrders() {
        const actions = this._centralDatabase.unbilledPurchaseOrders.map((po) => {
            return (db, producer) => {
                db.payPurchaseOrder(po);
                return producer.publish(new PurchaseOrderPaidEvent(po, po.totalPrice));
            };
        });
        return new DepartmentDecision(actions);
    }

    billForShippedSalesOrders() {
        const actions = this._centralDatabase.shippedSalesOrders.map((so) => {
            return (db, producer) => {
                db.invoiceForSalesOrder(so.salesOrderNumber);
                db.receivePaymentForSalesOrder(so, so.getTotalAmountDue());
                return producer.publish([
                    new SalesOrderInvoicedEvent(so, so.getTotalAmountDue()),
                    new SalesOrderInvoicePaidEvent(so, so.getTotalAmountDue())
                ]);
            };
        });
        return new DepartmentDecision(actions);
    }
};
