module.exports = class Order {
    constructor(data) {
        this.product = data.product;
        this.price = data.price;
        this.amount = data.amount;
    }

    get totalPrice() {
        return this.amount * this.price;
    }
}