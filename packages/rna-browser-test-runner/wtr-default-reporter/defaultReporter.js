"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultReporter = void 0;
const reportTestFileResults_1 = require("./reportTestFileResults");
const getTestProgress_1 = require("./getTestProgress");
function isBufferedLogger(logger) {
    return (typeof logger.logBufferedMessages === 'function' &&
        Array.isArray(logger.buffer));
}
function defaultReporter({ reportTestResults = true, reportTestProgress = true, } = {}) {
    let args;
    let favoriteBrowser;
    return {
        start(_args) {
            var _a;
            args = _args;
            favoriteBrowser = (_a = args.browserNames.find(name => {
                const n = name.toLowerCase();
                return n.includes('chrome') || n.includes('chromium') || n.includes('firefox');
            })) !== null && _a !== void 0 ? _a : args.browserNames[0];
        },
        reportTestFileResults({ logger, sessionsForTestFile, testFile }) {
            if (!reportTestResults) {
                return undefined;
            }
            if (!isBufferedLogger(logger)) {
                throw new Error('Expected a BufferedLogger instance.');
            }
            return reportTestFileResults_1.reportTestFileResults(logger, testFile, args.browserNames, favoriteBrowser, sessionsForTestFile);
        },
        getTestProgress({ testRun, focusedTestFile, testCoverage }) {
            if (!reportTestProgress) {
                return [];
            }
            return getTestProgress_1.getTestProgressReport(args.config, {
                browsers: args.browsers,
                browserNames: args.browserNames,
                testRun,
                testFiles: args.testFiles,
                sessions: args.sessions,
                startTime: args.startTime,
                focusedTestFile,
                watch: args.config.watch,
                coverage: !!args.config.coverage,
                coverageConfig: args.config.coverageConfig,
                testCoverage,
            });
        },
    };
}
exports.defaultReporter = defaultReporter;
//# sourceMappingURL=defaultReporter.js.map