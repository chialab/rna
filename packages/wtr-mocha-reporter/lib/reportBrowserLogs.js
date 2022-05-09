import chalk from 'chalk';

/**
 * @see https://github.com/modernweb-dev/web/blob/master/packages/test-runner/src/reporter/reportBrowserLogs.ts
 * @param {import('@web/test-runner-core').Logger} logger
 * @param {import('@web/test-runner-core').TestSession[]} sessions
 */
export function reportBrowserLogs(logger, sessions) {
    const logsByBrowser = new Map();

    for (const session of sessions) {
        for (const args of session.logs) {
            let logsForBrowser = logsByBrowser.get(session.browser.name);
            if (!logsForBrowser) {
                logsForBrowser = [];
                logsByBrowser.set(session.browser.name, logsForBrowser);
            }
            logsForBrowser.push(args);
        }
    }

    for (const [browser, logs] of logsByBrowser) {
        logger.log(chalk.bold(chalk.white(`Browser logs on ${browser}:`)));
        logger.group();
        logger.group();
        logger.group();
        for (const args of logs) {
            logger.log(...args);
        }
        logger.groupEnd();
        logger.groupEnd();
        logger.groupEnd();
        logger.log();
    }
}
