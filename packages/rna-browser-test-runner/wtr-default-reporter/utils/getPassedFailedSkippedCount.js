"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPassedFailedSkippedCount = void 0;
function getPassedFailedSkippedCount(testResults) {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    function collectTests(tests) {
        for (const test of tests) {
            if (test.skipped) {
                skipped += 1;
            }
            else if (test.passed) {
                passed += 1;
            }
            else {
                failed += 1;
            }
        }
    }
    function collectSuite(suite) {
        collectTests(suite.tests);
        for (const childSuite of suite.suites) {
            collectSuite(childSuite);
        }
    }
    collectSuite(testResults);
    return { passed, failed, skipped };
}
exports.getPassedFailedSkippedCount = getPassedFailedSkippedCount;
//# sourceMappingURL=getPassedFailedSkippedCount.js.map