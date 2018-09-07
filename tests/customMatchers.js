// custom matchers
expect.extend({
    toContainInstanceOf(received, expected) {
        if (!Array.isArray(received)) {
            return { actual: received, message: 'Expected value to be an Array', pass: false };
        }

        const pass = received.find(r => r instanceof expected) != null;

        const message = pass
            ? () => `Expected value to not include  ${this.utils.printExpected(expected)}\n`
            : () => `Expected value to include  ${this.utils.printExpected(expected)}\n`;

        return { actual: received, message, pass };
    }
});
