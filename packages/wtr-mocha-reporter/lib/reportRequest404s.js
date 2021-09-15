import chalk from 'chalk';

/**
 * @see https://github.com/modernweb-dev/web/blob/master/packages/test-runner/src/reporter/reportRequest404s.ts
 * @param {import('@web/test-runner-core').Logger} logger
 * @param {import('@web/test-runner-core').TestSession[]} sessions
 */
export function reportRequest404s(logger, sessions) {
    const request404sPerBrowser = new Map();

    for (const session of sessions) {
        for (const request404 of session.request404s) {
            let request404sForBrowser = request404sPerBrowser.get(session.browser.name);
            if (!request404sForBrowser) {
                request404sForBrowser = [];
                request404sPerBrowser.set(session.browser.name, request404sForBrowser);
            }
            request404sForBrowser.push(request404);
        }
    }

    for (const [browser, request404s] of request404sPerBrowser) {
        logger.log(chalk.bold(chalk.white(`404 network requests on ${browser}:`)));
        logger.group();
        logger.group();
        for (const request404 of request404s) {
            logger.log(`${chalk.bold(chalk.gray('-'))} ${request404}`);
        }
        logger.groupEnd();
        logger.groupEnd();
    }
}
