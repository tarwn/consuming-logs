module.exports = () => {
    return {
        files: [
            'src/**/*.js',
            'tests/fakeProducer.js'
        ],
        tests: [
            'tests/**/*.test.js'
        ],
        env: {
            type: 'node',
            runner: 'node'
        },

        testFramework: 'jest',

        debug: true
    };
};
