module.exports = class PlantConfig {
    constructor(config) {
        // configs w/ defaults
        this.productionLines = config.productionLines || 1;
        this.minimumOrderSize = config.minimumOrderSize || 1;

        // configs w/out defaults
        this.productionLineCapacity = config.productionLineCapacity;

        // product catalog
        this.productCatalog = config.productCatalog || [
            {
                partNumber: 'ABC123', name: 'Sample Part 1', unitPrice: 1.23, bom: { AB: 2, C123: 4 }
            }
        ];

        this.partsCatalog = config.partsCatalog || [
            { partNumber: 'AB', unitPrice: 0.10 },
            { partNumber: 'C123', unitPrice: 0.15 }
        ];
    }
};
