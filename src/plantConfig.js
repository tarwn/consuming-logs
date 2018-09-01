module.exports = class PlantConfig {
    constructor(config) {
        // configs w/ defaults
        this.productionLines = config.productionLines || 1;
        this.minimumOrderSize = config.minimumOrderSize || 1;

        // configs w/out defaults
        this.productionLineCapacity = config.productionLineCapacity;
    }
};
