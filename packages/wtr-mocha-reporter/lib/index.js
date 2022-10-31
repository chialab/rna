import chalk from 'chalk';
import { reporters } from '@chialab/es-test-runner';
import { reportBrowserLogs } from './reportBrowserLogs.js';
import { reportRequest404s } from './reportRequest404s.js';
import { getTestProgressReport } from './getTestProgress.js';
import { reportTestFileErrors } from './reportTestFileErrors.js';
import { Collector } from './Collector.js';

/**
 * Bind the WTR reporter to a Mocha reporter.
 * @param {typeof reporters.Base} MochaReporter The Mocha reporter class.
 */
export function mochaReporter(MochaReporter = reporters.Spec) {
    /**
     * @type {import('@web/test-runner-core').ReporterArgs}
     */
    let args;

    /**
     * @type {import('@web/test-runner-core').Logger}
     */
    let logger;

    /**
     * @type {import('@chialab/es-test-runner').MochaOptions}
     */
    let options;

    /**
     * @type {Map<string, Collector>}
     */
    const collectors = new Map();

    /**
     * Reset collectors.
     */
    const reset = () => {
        collectors.clear();
        args.browserNames.forEach((browserName) => {
            const collector = new Collector();
            collectors.set(browserName, collector);
            collector.collectStart();
        });
    };

    /**
     * @type {import('@web/test-runner-core').Reporter}
     */
    const reporter = {
        start(_args) {
            args = _args;

            logger = args.config.logger;
            options = /** @type {import('@chialab/es-test-runner').MochaOptions} */ (args.config.testFramework?.config || {});

            reset();
        },

        onTestRunStarted() {
            reset();
        },

        getTestProgress({ testRun, focusedTestFile, testCoverage }) {
            return getTestProgressReport(args.config, {
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

        onTestRunFinished() {
            for (const [browserName, collector] of collectors) {
                collector.collectEnd();

                const reporter = collector.createReporter(MochaReporter, options);
                if (reporter.stats.suites > 0 || reporter.stats.tests > 0) {
                    logger.log(chalk.bold(chalk.white(`Test results for ${browserName}:`)));
                    collector.printReport(reporter, logger);
                }
            }
        },

        reportTestFileResults({ sessionsForTestFile, logger }) {
            sessionsForTestFile.forEach((session) => {
                if (session.status !== 'FINISHED') {
                    return;
                }

                const collector = collectors.get(session.browser.name);
                if (collector && session.testResults) {
                    collector.collectSuiteResult(session.testResults);
                }
            });

            reportBrowserLogs(logger, sessionsForTestFile);
            reportRequest404s(logger, sessionsForTestFile);
            reportTestFileErrors(logger, args.browserNames, sessionsForTestFile);
        },
    };

    return reporter;
}
