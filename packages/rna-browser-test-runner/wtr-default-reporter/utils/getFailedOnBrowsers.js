"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFailedOnBrowsers = void 0;
function getFailedOnBrowsers(allBrowserNames, failedBrowsers) {
    if (allBrowserNames.length === 1 || failedBrowsers.length === allBrowserNames.length) {
        return '';
    }
    const browserString = failedBrowsers.length === 1
        ? failedBrowsers[0]
        : failedBrowsers.slice(0, -1).join(', ') + ' and ' + failedBrowsers.slice(-1);
    return ` (failed on ${browserString})`;
}
exports.getFailedOnBrowsers = getFailedOnBrowsers;
//# sourceMappingURL=getFailedOnBrowsers.js.map