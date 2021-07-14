"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFlattenedTestResults = void 0;
function getFlattenedTestResults(testResults) {
    const flattened = [];
    function collectTests(prefix, tests) {
        for (const test of tests) {
            flattened.push(Object.assign(Object.assign({}, test), { name: `${prefix}${test.name}` }));
        }
    }
    function collectSuite(prefix, suite) {
        collectTests(prefix, suite.tests);
        for (const childSuite of suite.suites) {
            const newPrefix = `${prefix}${childSuite.name} > `;
            collectSuite(newPrefix, childSuite);
        }
    }
    collectSuite('', testResults);
    return flattened;
}
exports.getFlattenedTestResults = getFlattenedTestResults;
//# sourceMappingURL=getFlattenedTestResults.js.map