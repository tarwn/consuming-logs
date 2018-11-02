module.exports = () => {
    return {
        files: [
            'simulator/src/**/*.js',
            'simulator/tests/fakeProducer.js',
            'simulator/tests/customMatchers.js'
        ],
        tests: [
            'simulator/tests/**/*.test.js'
        ],
        env: {
            type: 'node',
            runner: 'node'
        },

        testFramework: 'jest',

        debug: true,

        setup: (wallaby) => {
            /* eslint-disable-next-line */
            const jestConfig = require('./package.json').jest;
            wallaby.testFramework.configure(jestConfig);
        }
    };
};
