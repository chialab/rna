import mocha from 'mocha';
import { createRunner, reportMochaSuite } from './mochaRunner.js';
import { printCoverage } from './printCoverage.js';

/**
 * Bind the WTR reporter to a Mocha reporter.
 * @param {typeof mocha.reporters.Base} MochaReporter The Mocha reporter class.
 */
export function mochaReporter(MochaReporter = mocha.reporters.Spec) {
    /**
     * @type {import('./mochaRunner').Runner}
     */
    let runner;

    /**
     * @type {number}
     */
    let startTime;

    /**
     * @type {import('@web/test-runner-core').TestRunnerCoreConfig}
     */
    let runnerConfig;

    /**
     * @type {import('@web/test-runner-core').Reporter}
     */
    const reporter = {
        start({ config }) {
            runnerConfig = config;
            runner = createRunner();
            new MochaReporter(
                runner,
                /** @type {mocha.MochaOptions} */ (config.testFramework?.config || {})
            );

            startTime = Date.now();
            runner.emit(mocha.Runner.constants.EVENT_RUN_BEGIN);
        },

        onTestRunFinished({ testCoverage }) {
            if (runner.stats) {
                runner.stats.duration = Date.now() - startTime;
            }
            runner.emit(mocha.Runner.constants.EVENT_RUN_END);

            if (testCoverage) {
                printCoverage(testCoverage, runnerConfig.logger, runnerConfig.watch, runnerConfig.coverageConfig);
            }
        },

        async reportTestFileResults({ sessionsForTestFile }) {
            sessionsForTestFile.forEach((session) => {
                if (session.status !== 'FINISHED') {
                    return;
                }

                if (session.testResults) {
                    reportMochaSuite(runner, session.testResults);
                }
            });
        },
    };

    return reporter;
}
