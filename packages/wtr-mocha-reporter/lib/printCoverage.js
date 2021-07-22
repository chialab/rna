import path from 'path';
import chalk from 'chalk';

/**
 * @param {import('@web/test-runner-core').TestCoverage} testCoverage
 * @param {import('@web/test-runner-core').Logger} logger
 * @param {boolean} watch
 * @param {import('@web/test-runner-core').CoverageConfig} coverageConfig
 */
export function printCoverage(testCoverage, logger, watch, coverageConfig) {
    /**
     * @type {string[]}
     */
    const entries = [''];

    /**
     * @type {(keyof import('@web/test-runner-core').CoverageThresholdConfig)[]}
     */
    const coverageTypes = [
        'lines',
        'statements',
        'branches',
        'functions',
    ];

    const coverageSum = coverageTypes.reduce((all, type) => all + testCoverage.summary[type].pct, 0);
    const avgCoverage = Math.round((coverageSum * 100) / 4) / 100;

    if (!Number.isNaN(avgCoverage)) {
        entries.push(
            `Code coverage: ${chalk.bold(
                chalk[testCoverage.passed ? 'green' : 'red'](`${avgCoverage} %`)
            )}`
        );
    }

    if (!testCoverage.passed && coverageConfig.threshold) {
        coverageTypes.forEach((type) => {
            if (!coverageConfig.threshold) {
                return;
            }
            if (testCoverage.summary[type].pct < coverageConfig.threshold[type]) {
                entries.push(
                    `Coverage for ${chalk.bold(type)} failed with ${chalk.bold(
                        chalk.red(`${testCoverage.summary[type].pct} %`)
                    )} compared to configured ${chalk.bold(
                        `${coverageConfig.threshold[type]} %`
                    )}`
                );
            }
        });
    }

    if (!watch && coverageConfig.report && coverageConfig.reporters?.includes('lcov')) {
        entries.push(
            `View full coverage report at ${chalk.underline(
                path.join(coverageConfig.reportDir ?? '', 'lcov-report', 'index.html')
            )}`
        );
    }

    entries.push('');

    logger.log(entries.join('\n'));
}
