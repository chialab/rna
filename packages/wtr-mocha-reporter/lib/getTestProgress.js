/**
 * @see https://github.com/modernweb-dev/web/blob/master/packages/test-runner/src/reporter/getTestProgress.ts
 */

import chalk from 'chalk';

/**
 * @type {{ [key: string]: import('@web/test-runner-core').TestSessionStatus }}
 */
const SESSION_STATUS = {
    // waiting for a browser to free up and run this test session
    SCHEDULED: 'SCHEDULED',
    // browser is booting up, waiting to ping back that it's starting
    INITIALIZING: 'INITIALIZING',
    // browser has started, running the actual tests
    TEST_STARTED: /** @type {import('@web/test-runner-core').TestSessionStatus} */ ('TEST_STARTED'),
    // browser has collected the test results, but not yet results, logs or coverage
    TEST_FINISHED: /** @type {import('@web/test-runner-core').TestSessionStatus} */ ('TEST_FINISHED'),
    // finished running tests and collecting tests results, logs, coverage etc.
    FINISHED: 'FINISHED',
};

/**
 * @typedef {Object} TestProgressArgs
 * @property {import('@web/test-runner-core').BrowserLauncher[]} browsers
 * @property {string[]} browserNames
 * @property {string[]} testFiles
 * @property {number} testRun
 * @property {import('@web/test-runner-core').TestSessionManager} sessions
 * @property {number} startTime
 * @property {boolean} watch
 * @property {boolean} coverage
 * @property {string} [focusedTestFile]
 * @property {import('@web/test-runner-core').CoverageConfig} [coverageConfig]
 * @property {import('@web/test-runner-core').TestCoverage} [testCoverage]
 */

const PROGRESS_BLOCKS = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];
const PROGRESS_WIDTH = 30;

/**
 * Render progress bar blocks.
 * @param {number} value
 * @param {number} total
 * @returns Progress bar value.
 */
function createProgressBlocks(value, total) {
    if (value >= total) {
        return PROGRESS_BLOCKS[8].repeat(PROGRESS_WIDTH);
    }

    const count = (PROGRESS_WIDTH * value) / total;
    const floored = Math.floor(count);
    const partialBlock = PROGRESS_BLOCKS[Math.floor((count - floored) * (PROGRESS_BLOCKS.length - 1))];

    return `${PROGRESS_BLOCKS[8].repeat(floored)}${partialBlock}${' '.repeat(PROGRESS_WIDTH - floored - 1)}`;
}

/**
 * Render progress bar.
 * @param {number} finished
 * @param {number} active
 * @param {number} total
 * @returns Progress bar value.
 */
function renderProgressBar(finished, active, total) {
    const progressBlocks = createProgressBlocks(finished + active, total);
    const finishedBlockCount = Math.floor((PROGRESS_WIDTH * finished) / total);
    const finishedBlocks = chalk.white(progressBlocks.slice(0, finishedBlockCount));
    const scheduledBlocks = chalk.gray(progressBlocks.slice(finishedBlockCount));

    return `|${finishedBlocks}${scheduledBlocks}|`;
}

/**
 * Render progress report.
 * @param {string} name
 * @param {number} minWidth
 * @param {number} finishedFiles
 * @param {number} activeFiles
 * @param {number} testFiles
 * @param {number} passedTests
 * @param {number} skippedTests
 * @param {number} failedTests
 * @returns The progress report string.
 */
function getProgressReport(
    name,
    minWidth,
    finishedFiles,
    activeFiles,
    testFiles,
    passedTests,
    skippedTests,
    failedTests
) {
    const failedText = `${failedTests} failed`;
    const testResults = `${chalk.green(`${passedTests} passed`)}, ${
        failedTests !== 0 ? chalk.red(failedText) : failedText
    }${skippedTests !== 0 ? `, ${chalk.gray(`${skippedTests} skipped`)}` : ''}`;
    const progressBar = `${renderProgressBar(
        finishedFiles,
        activeFiles,
        testFiles
    )} ${finishedFiles}/${testFiles} test files`;

    return `${`${name}:`.padEnd(minWidth)} ${progressBar} | ${testResults}`;
}

/**
 * Get passed/failed/skipped test counts.
 * @param {import('@web/test-runner-core').TestSuiteResult} testResults
 * @returns Report object.
 */
function getPassedFailedSkippedCount(testResults) {
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    /**
     * @param {import('@web/test-runner-core').TestResult[]} tests
     */
    function collectTests(tests) {
        for (const test of tests) {
            if (test.skipped) {
                skipped += 1;
            } else if (test.passed) {
                passed += 1;
            } else {
                failed += 1;
            }
        }
    }

    /**
     * @param {import('@web/test-runner-core').TestSuiteResult} suite
     */
    function collectSuite(suite) {
        collectTests(suite.tests);

        for (const childSuite of suite.suites) {
            collectSuite(childSuite);
        }
    }

    collectSuite(testResults);

    return { passed, failed, skipped };
}

/**
 * Generate progress report.
 * @param {import('@web/test-runner-core').TestRunnerCoreConfig} config
 * @param {TestProgressArgs} args
 * @returns A list of logs.
 */
export function getTestProgressReport(config, args) {
    const { browsers, browserNames, testRun, sessions, focusedTestFile, coverage, testCoverage } = args;

    const entries = [];
    const unfinishedSessions = Array.from(
        sessions.forStatusAndTestFile(
            focusedTestFile,
            SESSION_STATUS.SCHEDULED,
            SESSION_STATUS.INITIALIZING,
            SESSION_STATUS.TEST_STARTED,
            SESSION_STATUS.TEST_FINISHED
        )
    );

    const finishedFiles = new Set();
    const longestBrowser = [...browserNames].sort((a, b) => b.length - a.length)[0];
    const minWidth = longestBrowser ? longestBrowser.length + 1 : 0;
    for (const browser of browsers) {
        // when started or not initiliazing we render a progress bar
        const allSessionsForBrowser = Array.from(sessions.forBrowser(browser));
        const sessionsForBrowser = focusedTestFile
            ? allSessionsForBrowser.filter((s) => s.testFile === focusedTestFile)
            : allSessionsForBrowser;
        const totalTestFiles = sessionsForBrowser.length;
        let finishedFilesForBrowser = 0;
        let activeFilesForBrowser = 0;
        let passedTestsForBrowser = 0;
        let skippedTestsForBrowser = 0;
        let failedTestsForBrowser = 0;

        for (const session of sessionsForBrowser) {
            if (![SESSION_STATUS.SCHEDULED, SESSION_STATUS.FINISHED].includes(session.status)) {
                activeFilesForBrowser += 1;
            }

            if (session.status === SESSION_STATUS.FINISHED) {
                const { testFile, testResults } = session;
                finishedFiles.add(testFile);
                finishedFilesForBrowser += 1;
                if (testResults) {
                    const parsed = getPassedFailedSkippedCount(testResults);
                    passedTestsForBrowser += parsed.passed;
                    skippedTestsForBrowser += parsed.skipped;
                    failedTestsForBrowser += parsed.failed;
                }
            }
        }

        entries.push(
            getProgressReport(
                browser.name,
                minWidth,
                finishedFilesForBrowser,
                activeFilesForBrowser,
                totalTestFiles,
                passedTestsForBrowser,
                skippedTestsForBrowser,
                failedTestsForBrowser
            )
        );
    }

    entries.push('');

    if (testRun !== -1 && unfinishedSessions.length === 0) {
        if (coverage && !testCoverage) {
            entries.push(chalk.bold('Calculating code coverage...'));
        } else if (config.watch) {
            entries.push(chalk.bold('Finished running tests, watching for file changes...'));
        } else {
            return [];
        }
    } else {
        entries.push(chalk.bold('Running tests...'));
    }

    entries.push('');

    return entries;
}
