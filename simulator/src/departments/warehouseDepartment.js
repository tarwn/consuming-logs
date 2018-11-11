const PartsInventoryIncreasedEvent = require('../events/partsInventoryIncreased');
const PurchaseOrderReceivedEvent = require('../events/purchaseOrderReceived');
const SalesOrderShippedEvent = require('../events/salesOrderShipped');
const ShipmentTrackingUpdatedEvent = require('../events/shipmentTrackingUpdated');
const ShipmentArrivedEvent = require('../events/shipmentArrived');
const DepartmentDecision = require('../departmentDecision');
const Shipment = require('../dtos/shipment');

module.exports = class WarehouseDepartment {
    constructor(plantConfig, centralDatabase) {
        this._config = plantConfig;
        this._centralDatabase = centralDatabase;
    }

    async receivePurchasedParts() {
        const arrivingShipments = this._centralDatabase.trackedShipments
            .filter(s => s.orderType === 'PurchaseOrder' && s.hasOrderArrived());

        const arrivingPurchaseOrders = arrivingShipments.map((s) => {
            return {
                shipment: s,
                purchaseOrder: this._centralDatabase.openPurchaseOrders.find((po) => {
                    return po.purchaseOrderNumber === s.orderNumber;
                })
            };
        });

        const actions = arrivingPurchaseOrders.map((avp) => {
            return async (db, producer) => {
                const newTotal = await db.receivePurchaseOrder(avp.purchaseOrder);
                await db.stopTrackingShipment(avp.shipment.shipmentNumber);
                await producer.publish([
                    new PurchaseOrderReceivedEvent(avp.purchaseOrder),
                    new PartsInventoryIncreasedEvent(
                        avp.purchaseOrder.partNumber,
                        avp.purchaseOrder.quantity,
                        newTotal
                    ),
                    new ShipmentArrivedEvent(avp.shipment)
                ]);
            };
        });
        return new DepartmentDecision(actions);
    }

    async shipCompletedSalesOrders() {
        const readyToShip = this._centralDatabase.scheduledProductionOrders
            .filter(po => po.isComplete)
            .map((po) => {
                return {
                    productionOrder: po,
                    salesOrder: this._centralDatabase.openSalesOrders.find((so) => {
                        return so.salesOrderNumber === po.salesOrderNumber;
                    })
                };
            });

        const actions = readyToShip.map((o) => {
            return async (db, producer) => {
                await db.stageProductionOrderToShip(o.productionOrder.productionOrderNumber);
                const shipment = new Shipment(
                    null,
                    'SalesOrder',
                    o.salesOrder.salesOrderNumber,
                    o.salesOrder.partNumber,
                    o.salesOrder.orderQuantity
                );
                await db.shipShipment(shipment);
                await db.indicateSalesOrderHasShipped(o.salesOrder.salesOrderNumber);
                await producer.publish(new SalesOrderShippedEvent(shipment, o.salesOrder));
            };
        });
        return new DepartmentDecision(actions);
    }

    async stopTrackingDeliveredSalesOrders() {
        const arrivingShipments = this._centralDatabase.trackedShipments
            .filter(s => s.orderType === 'SalesOrder' && s.hasOrderArrived());

        const actions = arrivingShipments.map((s) => {
            return async (db, producer) => {
                await db.stopTrackingShipment(s.shipmentNumber);
                await producer.publish(new ShipmentArrivedEvent(s));
            };
        });
        return new DepartmentDecision(actions);
    }

    async updateTrackingForInTransitShipments() {
        const actions = this._centralDatabase.trackedShipments
            .filter(s => !s.hasOrderArrived())
            .map((s) => {
                return async (db, producer) => {
                    s.decrementShipTime();
                    await db.updateTrackedShipment(s);
                    await producer.publish(new ShipmentTrackingUpdatedEvent(s));
                };
            });
        return new DepartmentDecision(actions);
    }
};
