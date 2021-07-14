"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCodeCoverage = void 0;
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const coverageTypes = [
    'lines',
    'statements',
    'branches',
    'functions',
];
function getCodeCoverage(testCoverage, watch, coverageConfig) {
    var _a;
    const entries = [];
    const coverageSum = coverageTypes.reduce((all, type) => all + testCoverage.summary[type].pct, 0);
    const avgCoverage = Math.round((coverageSum * 100) / 4) / 100;
    if (!Number.isNaN(avgCoverage)) {
        entries.push(`Code coverage: ${chalk_1.default.bold(chalk_1.default[testCoverage.passed ? 'green' : 'red'](`${avgCoverage} %`))}`);
    }
    if (!testCoverage.passed && coverageConfig.threshold) {
        coverageTypes.forEach(type => {
            if (testCoverage.summary[type].pct < coverageConfig.threshold[type]) {
                entries.push(`Coverage for ${chalk_1.default.bold(type)} failed with ${chalk_1.default.bold(chalk_1.default.red(`${testCoverage.summary[type].pct} %`))} compared to configured ${chalk_1.default.bold(`${coverageConfig.threshold[type]} %`)}`);
            }
        });
    }
    if (!watch && coverageConfig.report && ((_a = coverageConfig.reporters) === null || _a === void 0 ? void 0 : _a.includes('lcov'))) {
        entries.push(`View full coverage report at ${chalk_1.default.underline(path_1.default.join(coverageConfig.reportDir, 'lcov-report', 'index.html'))}`);
    }
    entries.push('');
    return entries;
}
exports.getCodeCoverage = getCodeCoverage;
//# sourceMappingURL=getCodeCoverage.js.map