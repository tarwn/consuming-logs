module.exports = class RawPart {
    constructor(partNumber, baseUnitPrice) {
        this.partNumber = partNumber;
        this._baseUnitPrice = baseUnitPrice;
    }

    getBestPriceQuote() {
        return {
            price: this._baseUnitPrice
        };
    }
};
