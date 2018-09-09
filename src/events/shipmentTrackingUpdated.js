const BaseEvent = require('./baseEvent');

module.exports = class ShipmentTrackingUpdatedEvent extends BaseEvent {
    constructor(shipment) {
        super('ShipmentTrackingUpdated');
        this.shipment = shipment;
    }
};
