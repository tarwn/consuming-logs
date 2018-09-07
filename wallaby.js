module.exports = () => {
    return {
        files: [
            'src/**/*.js',
            'tests/fakeProducer.js',
            'tests/customMatchers.js'
        ],
        tests: [
            'tests/**/*.test.js'
        ],
        env: {
            type: 'node',
            runner: 'node'
        },

        testFramework: 'jest',

        debug: true,

        setup: (wallaby) => {
            const jestConfig = require('./package.json').jest;
            wallaby.testFramework.configure(jestConfig);
        }
    };
};
