import { EventEmitter } from 'events';
import { Suite, Test, Runner, reporters } from '@chialab/es-test-runner';

/**
 * @typedef {Error & { actual?: string, expected?: string }} TestError
 */

const constants = Runner.constants;

/**
 * A collector of mocha events.
 */
export class Collector {
    /**
     * The main test suite.
     * @private
     */
    suite = new Suite('');

    /**
     * @type {([string]|[string, Test|Suite]|[string, Test, TestError])[]}
     * @private
     */
    events = [];

    /**
     * Collect stats.
     * @private
     */
    stats = {
        suites: 0,
        tests: 0,
        passes: 0,
        failures: 0,
        pending: 0,
        duration: 0,
    };

    /**
     * Mocha runner like emitter.
     * @private
     */
    runner = /** @type {Runner} */(/** @type {unknown} */ (new EventEmitter()));

    constructor() {
        Object.assign(this.runner, {
            stats: this.stats,
        });
    }

    /**
     * Start the collector runner.
     */
    collectStart() {
        this.startTime = Date.now();
        this.events.push([constants.EVENT_RUN_BEGIN]);
    }

    /**
     * End the collector runner.
     */
    collectEnd() {
        if (this.startTime) {
            this.stats.duration = Date.now() - this.startTime;
        }
        this.events.push([constants.EVENT_RUN_END]);
    }

    /**
     * Collect suite.
     * @param {Suite} suite
     */
    collectSuiteStart(suite) {
        if (!suite.parent) {
            this.stats.suites++;
        }
        this.events.push([constants.EVENT_SUITE_BEGIN, suite]);
    }

    /**
     * Collect the ended suite.
     * @param {Suite} suite
     */
    collectSuiteEnd(suite) {
        this.events.push([constants.EVENT_SUITE_END, suite]);
    }

    /**
     * Collect a test.
     * @param {Suite} suite
     * @param {Test} test
     */
    collectTest(suite, test) {
        if (suite && test) {
            this.stats.tests++;
        }
    }

    /**
     * Collect pending test.
     * @param {Test} test
     */
    collectPendingTest(test) {
        this.stats.pending++;
        this.events.push([constants.EVENT_TEST_PENDING, test]);
    }

    /**
     * Collect passed test.
     * @param {Test} test
     */
    collectPassedTest(test) {
        this.stats.passes++;
        this.events.push([constants.EVENT_TEST_PASS, test]);
    }

    /**
     * Collect failed test.
     * @param {Test} test
     * @param {TestError} err
     */
    collectFailedTest(test, err) {
        this.stats.failures++;
        this.events.push([constants.EVENT_TEST_FAIL, test, err]);
    }

    /**
     * Create and sync a Mocha suite instance.
     * @param {import('@web/test-runner-core').TestSuiteResult} suiteResult The WTR suite result.
     * @param {Suite} [parentSuite] The parent Mocha suite.
     * @returns The Mocha suite instance.
     */
    collectSuiteResult(suiteResult, parentSuite) {
        parentSuite = parentSuite || this.suite;

        const suite = parentSuite.suites.find(({ title }) => suiteResult.name === title) || new Suite(suiteResult.name);
        if (parentSuite && !suite.parent) {
            parentSuite.addSuite(suite);
        }
        this.collectSuiteStart(suite);
        suiteResult.tests.forEach((testResult) => this.collectTestResult(suite, testResult));
        suiteResult.suites.forEach((childResult) => this.collectSuiteResult(childResult, suite));
        this.collectSuiteEnd(suite);

        return suite;
    }

    /**
     * Create and sync a Mocha test instance.
     * @param {Suite} suite The current Mocha suite.
     * @param {import('@web/test-runner-core').TestResult} testResult The WTR test result.
     * @returns The Mocha test instance.
     */
    collectTestResult(suite, testResult) {
        const tests = suite.tests || [];
        for (let i = 0; i < tests.length; i++) {
            const test = tests[i];
            if (test.title === testResult.name) {
                this.collectTestWithStatus(test, testResult);
                return test;
            }
        }

        const test = new Test(testResult.name, async () => { });
        suite.addTest(test);
        this.collectTest(suite, test);
        this.collectTestWithStatus(test, testResult);
        return test;
    }

    /**
     * Collect test result.
     * @param {Test} test
     * @param {import('@web/test-runner-core').TestResult} testResult The WTR test result.
     */
    collectTestWithStatus(test, testResult) {
        if (testResult.skipped) {
            test.pending = true;
            this.collectPendingTest(test);
        } else if (testResult.passed) {
            test.duration = testResult.duration;
            test.pending = false;
            test.state = 'passed';
            this.collectPassedTest(test);
        } else {
            test.duration = testResult.duration;
            test.pending = false;
            test.state = 'failed';

            const err = /** @type {TestError} */ (new Error('Failed'));
            if (testResult.error) {
                err.message = testResult.error.message;
                err.stack = testResult.error.stack;
                if (testResult.error.name) {
                    err.name = testResult.error.name;
                }
                err.actual = testResult.error.actual;
                err.expected = testResult.error.expected;
            }

            this.collectFailedTest(test, err);
        }
    }

    /**
     * Crete the mocha reporter.
     * @param {typeof reporters.Base} Reporter
     * @param {import('mocha').MochaOptions} options
     * @returns Reporter instance.
     */
    createReporter(Reporter, options) {
        return new Reporter(this.runner, options);
    }

    /**
     * Print report.
     * @param {reporters.Base} reporter The reporter instance.
     * @param {import('@web/test-runner-core').Logger} logger
     */
    printReport(reporter, logger) {
        (/** @type {any} */ (reporters.Base)).consoleLog = logger.log.bind(logger);
        this.events.forEach((event) => {
            this.runner.emit.apply(this.runner, event);
        });
    }
}
