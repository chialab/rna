"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportTestsErrors = exports.formatError = void 0;
const chalk_1 = __importDefault(require("chalk"));
const diff = __importStar(require("diff"));
const getFailedOnBrowsers_1 = require("./utils/getFailedOnBrowsers");
const getFlattenedTestResults_1 = require("./utils/getFlattenedTestResults");
function renderDiff(actual, expected) {
    function cleanUp(line) {
        if (line[0] === '+') {
            return chalk_1.default.green(line);
        }
        if (line[0] === '-') {
            return chalk_1.default.red(line);
        }
        if (line.match(/@@/)) {
            return null;
        }
        if (line.match(/\\ No newline/)) {
            return null;
        }
        return line;
    }
    const diffMsg = diff
        .createPatch('string', actual, expected)
        .split('\n')
        .splice(4)
        .map(cleanUp)
        .filter(l => !!l)
        .join('\n');
    return `${chalk_1.default.green('+ expected')} ${chalk_1.default.red('- actual')}\n\n${diffMsg}`;
}
function formatError(error) {
    const strings = [];
    const { name, message = 'Unknown error' } = error;
    const errorMsg = name ? `${name}: ${message}` : message;
    const showDiff = typeof error.expected === 'string' && typeof error.actual === 'string';
    strings.push(chalk_1.default.red(errorMsg));
    if (showDiff) {
        strings.push(`${renderDiff(error.actual, error.expected)}\n`);
    }
    if (error.stack) {
        if (showDiff) {
            const dedented = error.stack
                .split('\n')
                .map(s => s.trim())
                .join('\n');
            strings.push(chalk_1.default.gray(dedented));
        }
        else {
            strings.push(chalk_1.default.gray(error.stack));
        }
    }
    if (!error.expected && !error.stack) {
        strings.push(chalk_1.default.red(error.message || 'Unknown error'));
    }
    return strings.join('\n');
}
exports.formatError = formatError;
function reportTestsErrors(logger, allBrowserNames, favoriteBrowser, failedSessions) {
    var _a;
    const testErrorsPerBrowser = new Map();
    for (const session of failedSessions) {
        if (session.testResults) {
            const flattenedTests = getFlattenedTestResults_1.getFlattenedTestResults(session.testResults);
            for (const test of flattenedTests) {
                if (test.error) {
                    let testErrorsForBrowser = testErrorsPerBrowser.get(test.name);
                    if (!testErrorsForBrowser) {
                        testErrorsForBrowser = new Map();
                        testErrorsPerBrowser.set(test.name, testErrorsForBrowser);
                    }
                    if (test.error) {
                        testErrorsForBrowser.set(session.browser.name, test.error);
                    }
                }
            }
        }
    }
    if (testErrorsPerBrowser.size > 0) {
        for (const [name, errorsForBrowser] of testErrorsPerBrowser) {
            const failedBrowsers = Array.from(errorsForBrowser.keys());
            const error = (_a = errorsForBrowser.get(favoriteBrowser)) !== null && _a !== void 0 ? _a : errorsForBrowser.get(failedBrowsers[0]);
            const failedOn = getFailedOnBrowsers_1.getFailedOnBrowsers(allBrowserNames, failedBrowsers);
            logger.log(` ❌ ${name}${failedOn}`);
            logger.group();
            logger.group();
            logger.group();
            logger.log(formatError(error));
            logger.groupEnd();
            logger.groupEnd();
            logger.groupEnd();
            logger.log('');
        }
    }
}
exports.reportTestsErrors = reportTestsErrors;
//# sourceMappingURL=reportTestsErrors.js.map