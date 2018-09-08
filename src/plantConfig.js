module.exports = class PlantConfig {
    constructor(config) {
        // configs w/ defaults
        this.productionLines = config.productionLines || 1;
        this.minimumOrderSize = config.minimumOrderSize || 1;

        // configs w/out defaults
        this.productionCapacityPerInterval = config.productionCapacityPerInterval;
        this.productionScrapPercentage = config.productionScrapPercentage || 0;

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

    get isValid() {
        const requiredFields = ['productionCapacityPerInterval', 'productCatalog', 'partsCatalog'];

        return !requiredFields.some(f => !PlantConfig._isFieldValid(this[f]));
    }

    get validationErrors() {
        const requiredFields = ['productionCapacityPerInterval', 'productCatalog', 'partsCatalog'];
        return requiredFields.filter(f => !PlantConfig._isFieldValid(this[f]))
            .map(f => PlantConfig._fieldValidationError(f, this[f]));
    }

    static _isFieldValid(value) {
        if (value == null) {
            return false;
        }

        if (Array.isArray(value) && value.length === 0) {
            return false;
        }

        return true;
    }

    static _fieldValidationError(fieldName, value) {
        if (value == null) {
            return `${fieldName} is null`;
        }

        if (Array.isArray(value) && value.length === 0) {
            return `${fieldName} is an empty array`;
        }

        return `${fieldName} has found a new way to break validation. It's alive...`;
    }
};
