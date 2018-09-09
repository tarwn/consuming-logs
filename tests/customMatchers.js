// custom matchers
expect.extend({
    toContainInstanceOf(received, expected, expectedCount) {
        if (!Array.isArray(received)) {
            return { actual: received, message: 'Expected value to be an Array', pass: false };
        }
        if (expectedCount != null) {
            throw new Error('toContainInstanceOf does not support a second argument, are you looking for toContainInstancesOf()?');
        }

        const pass = received.find(r => r instanceof expected) != null;

        const message = pass
            ? () => `Expected value to not include  ${this.utils.printExpected(expected)}\n`
            : () => `Expected value to include  ${this.utils.printExpected(expected)}\n`;

        return { actual: received, message, pass };
    },
    toContainInstancesOf(received, expected, expectedCount = 1) {
        if (!Array.isArray(received)) {
            return { actual: received, message: 'Expected value to be an Array', pass: false };
        }

        const pass = received.filter(r => r instanceof expected).length === expectedCount;

        const message = pass
            ? () => `Expected value to not include ${expectedCount} ${this.utils.printExpected(expected)}\n`
            : () => `Expected value to include ${expectedCount} ${this.utils.printExpected(expected)}\n`;

        return { actual: received, message, pass };
    }
});
