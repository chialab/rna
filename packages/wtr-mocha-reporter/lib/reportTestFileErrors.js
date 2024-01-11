import chalk from 'chalk';

/** @typedef {{ testFile: string; failedBrowsers: string[]; error: import('@web/test-runner-core').TestResultError }} ErrorReport */

/**
 * Check if same errror.
 * @param {import('@web/test-runner-core').TestResultError} a
 * @param {import('@web/test-runner-core').TestResultError} b
 */
function isSameError(a, b) {
    return a.message === b.message && a.stack === b.stack;
}

/**
 * @see https://github.com/modernweb-dev/web/blob/master/packages/test-runner/src/reporter/reportTestFileErrors.ts
 * @param {import('@web/test-runner-core').Logger} logger
 * @param {string[]} browserNames
 * @param {import('@web/test-runner-core').TestSession[]} sessionsForTestFile
 */
export function reportTestFileErrors(logger, browserNames, sessionsForTestFile) {
    /**
     * @type {ErrorReport[]}
     */
    const reports = [];

    for (const session of sessionsForTestFile) {
        for (const error of session.errors) {
            let report = reports.find((r) => isSameError(r.error, error));
            if (!report) {
                report = {
                    testFile: session.testFile,
                    failedBrowsers: [],
                    error,
                };
                reports.push(report);
            }
            report.failedBrowsers.push(session.browser.name);
            report.error = error;
        }
    }

    for (const report of reports) {
        const { name, message = 'Unknown error' } = report.error;
        const errorMsg = name ? `${name}: ${message}` : message;

        if (report.error.stack) {
            // there was a stack trace, take the first line and decorate it with an icon and which browsers it failed on
            logger.log(`${chalk.red(errorMsg)} ${report.failedBrowsers.join(', ')}`);

            // if there was more to the stack trace, print it
            logger.group();
            logger.group();
            logger.log(report.testFile);
            logger.log(chalk.gray(report.error.stack));
            logger.groupEnd();
            logger.groupEnd();
        } else {
            // there was no stack trace, so just print the error message
            logger.log(`${errorMsg} ${report.failedBrowsers.join(', ')}`);
            logger.log(report.testFile);
        }

        logger.log();
    }
}
