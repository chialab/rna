import { EventEmitter } from 'events';
import mocha from 'mocha';

/**
 * @typedef {mocha.Runner & { suite?: mocha.Suite }} Runner
 */

/**
 * @typedef {Error & { actual?: string, expected?: string }} TestError
 */

/**
 * Update the Mocha test instance with WTR test result.
 * @param {Runner} runner The fake Mocha runner.
 * @param {mocha.Test} test The test instance.
 * @param {import('@web/test-runner-core').TestResult} testResult The WTR test result.
 */
export function syncMochaTest(runner, test, testResult) {
    if (testResult.skipped) {
        if (runner.stats) {
            runner.stats.pending++;
        }
        test.pending = true;
        runner.emit(mocha.Runner.constants.EVENT_TEST_PENDING, test);
    } else {
        test.duration = testResult.duration;
        test.pending = false;
        if (testResult.passed) {
            if (runner.stats) {
                runner.stats.passes++;
            }
            test.state = 'passed';
            runner.emit(mocha.Runner.constants.EVENT_TEST_PASS, test);
        } else {
            if (runner.stats) {
                runner.stats.failures++;
            }
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
            runner.emit(mocha.Runner.constants.EVENT_TEST_FAIL, test, err);
        }
    }
}

/**
 * Create and sync a Mocha test instance.
 * @param {Runner} runner The fake Mocha runner.
 * @param {mocha.Suite} suite The current Mocha suite.
 * @param {import('@web/test-runner-core').TestResult} testResult The WTR test result.
 * @return The Mocha test instance.
 */
export function reportMochaTest(runner, suite, testResult) {
    const tests = suite.tests || [];
    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        if (test.title === testResult.name) {
            syncMochaTest(runner, test, testResult);
            return test;
        }
    }

    const test = new mocha.Test(testResult.name, async () => { });
    if (runner.stats) {
        runner.stats.tests++;
    }
    suite.addTest(test);
    syncMochaTest(runner, test, testResult);

    return test;
}

/**
 * Create and sync a Mocha suite instance.
 * @param {Runner} runner The fake Mocha runner.
 * @param {import('@web/test-runner-core').TestSuiteResult} testSuiteResult The WTR suite result.
 * @param {mocha.Suite} [parentSuite] The parent Mocha suite.
 * @return The Mocha suite instance.
 */
export function reportMochaSuite(runner, testSuiteResult, parentSuite) {
    parentSuite = parentSuite || (runner.suite = runner.suite || new mocha.Suite(''));

    const suite = parentSuite.suites.find(({ title }) => testSuiteResult.name === title) || new mocha.Suite(testSuiteResult.name);
    if (!suite.parent) {
        if (runner.stats) {
            runner.stats.suites++;
        }
        parentSuite.addSuite(suite);
    }

    runner.emit(mocha.Runner.constants.EVENT_SUITE_BEGIN, suite);
    testSuiteResult.tests.forEach((testResult) => reportMochaTest(runner, suite, testResult));
    runner.emit(mocha.Runner.constants.EVENT_SUITE_END, suite);
    testSuiteResult.suites.forEach((childResult) => reportMochaSuite(runner, childResult, suite));

    return suite;
}

/**
 * Create a fake Mocha runner to use for reporting.
 */
export function createRunner() {
    const runner = /** @type {Runner} */ (new EventEmitter());
    runner.stats = {
        suites: 0,
        tests: 0,
        passes: 0,
        failures: 0,
        pending: 0,
        duration: 0,
    };
    return runner;
}
