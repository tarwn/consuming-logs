module.exports = () => {
    return {
        files: [
            'src/**/*.js',
            '!src/**/*.test.js'
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
