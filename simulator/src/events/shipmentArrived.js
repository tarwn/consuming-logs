const BaseEvent = require('./baseEvent');

module.exports = class ShipmentArrivedEvent extends BaseEvent {
    constructor(shipment) {
        super('ShipmentArrived');
        this.shipment = shipment;
    }
};
