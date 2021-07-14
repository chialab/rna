"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportTestFileResults = void 0;
const chalk_1 = __importDefault(require("chalk"));
const path_1 = require("path");
const reportTestsErrors_1 = require("./reportTestsErrors");
const reportBrowserLogs_1 = require("./reportBrowserLogs");
const reportRequest404s_1 = require("./reportRequest404s");
const reportTestFileErrors_1 = require("./reportTestFileErrors");
function reportTestFileResults(logger, testFile, allBrowserNames, favoriteBrowser, sessionsForTestFile) {
    const failedSessions = sessionsForTestFile.filter(s => !s.passed);
    reportBrowserLogs_1.reportBrowserLogs(logger, sessionsForTestFile);
    reportRequest404s_1.reportRequest404s(logger, sessionsForTestFile);
    reportTestFileErrors_1.reportTestFileErrors(logger, allBrowserNames, favoriteBrowser, sessionsForTestFile);
    if (failedSessions.length > 0) {
        reportTestsErrors_1.reportTestsErrors(logger, allBrowserNames, favoriteBrowser, failedSessions);
    }
    if (logger.buffer.length > 0) {
        logger.buffer.unshift({
            method: 'log',
            args: [`${chalk_1.default.bold(chalk_1.default.cyanBright(path_1.relative(process.cwd(), testFile)))}:\n`],
        });
    }
}
exports.reportTestFileResults = reportTestFileResults;
//# sourceMappingURL=reportTestFileResults.js.map