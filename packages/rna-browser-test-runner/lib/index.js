import path from 'path';
import process from 'process';
import { cpus } from 'os';
import { createRequire } from 'module';
import { mochaReporter } from '@chialab/wtr-mocha-reporter';
import { coverageReporter } from '@chialab/wtr-coverage-reporter';
import { HELPERS_PATH } from '@chialab/wds-plugin-node-resolve';
import { TestRunner, TestRunnerCli } from '@web/test-runner-core';
import { PlaywrightLauncher } from '@web/test-runner-playwright';
import { loadDevServerConfig, createDevServer } from '@chialab/rna-dev-server';

const require = createRequire(import.meta.url);

export { TestRunner };

/**
 * @typedef {Object} TestRunnerCoreConfig
 * @property {string[]|import('@web/test-runner-core').BrowserLauncher[]} [browsers]
 * @property {Record<string, string>} [alias]
 */

/**
 * @typedef {Partial<Omit<import('@web/test-runner-core').TestRunnerCoreConfig, 'browsers'>> & TestRunnerCoreConfig} TestRunnerConfig
 */

/**
 * @typedef {import('@web/test-runner-core').TestRunnerPlugin} TestRunnerPlugin
 */

/**
 * @typedef {import('@web/test-runner-core').TestFramework} TestFramework
 */

/**
 * @typedef {import('@web/test-runner-core').BrowserLauncher} BrowserLauncher
 */

/**
 * @typedef {import('@web/test-runner-core').Reporter} Reporter
 */

/**
 * Start the test runner.
 * @param {TestRunnerConfig} config
 * @param {import('@chialab/rna-logger').Logger} logger
 */
export async function startTestRunner(config, logger) {
    const devServerConfig = await loadDevServerConfig(config);
    const devServer = await createDevServer(devServerConfig, logger);

    const testFramework =
        /**
         * @type {TestFramework}
         */
        ({
            path: path.relative(process.cwd(), require.resolve('@web/test-runner-mocha/dist/autorun.js')),
            config: {
                ui: 'bdd',
                timeout: '10000',
            },
        });

    /**
     * @type {import('@web/test-runner-core').TestRunnerCoreConfig}
     */
    const runnerConfig = {
        protocol: 'http:',
        hostname: 'localhost',
        logger: config.logger,
        browserStartTimeout: 2 * 60 * 1000,
        testsStartTimeout: 20 * 1000,
        testsFinishTimeout: 2 * 60 * 1000,
        concurrency: 1,
        concurrentBrowsers: Math.max(1, cpus().length / 2),
        files: [
            'test/**/*.test.js',
            'test/**/*.spec.js',
        ],
        coverageConfig: {
            exclude: [
                '**/node_modules/**/*',
                '**/web_modules/**/*',
                '**/__wds-outside-root__/**',
                `**/${HELPERS_PATH}/**`,
            ],
            threshold: { statements: 0, functions: 0, branches: 0, lines: 0 },
            report: true,
            reportDir: 'coverage',
            reporters: ['lcov'],
        },
        reporters: [
            mochaReporter(),
            coverageReporter(),
        ],
        testFramework,
        open: false,
        browserLogs: true,
        ...(/** @type {*} */ (config)),
        port: config.port || 8080,
        middleware: [
            ...(devServer.config.middleware || []),
            ...(config.middleware || []),
        ],
        plugins: [
            ...(devServer.config.plugins || []),
            ...(config.plugins || []),
        ],
    };

    const runner = new TestRunner(runnerConfig);
    const cli = new TestRunnerCli(runnerConfig, runner);

    return {
        runner,
        cli,
    };
}

/**
 * Start the test runner.
 * @param {TestRunnerConfig} config
 * @param {import('@chialab/rna-logger').Logger} logger
 * @returns {Promise<TestRunner>} The test runner instance.
 */
export async function test(config, logger) {
    const { runner, cli } = await startTestRunner(config, logger);

    await runner.start();
    cli.start();

    return runner;
}

/** @typedef {'chromium'|'chrome'|'chrome-beta'|'chrome-dev'|'firefox'|'webkit'|'msedge'|'msedge-beta'|'msedge-dev'} BrowserName */

/**
 * Normalize browser names.
 * @param {string[]} browsers
 * @returns {BrowserName[]}
 */
function normalizeBrowserNames(browsers) {
    const result = browsers.map((browser) => {
        browser = browser.toLowerCase();

        switch (browser) {
            case 'safari':
                return 'webkit';
            case 'edge':
                return 'msedge';
            default:
                return browser;
        }
    });

    return /** @type {BrowserName[]} */ (result);
}

/**
 * Get the playwright product name.
 * @param {BrowserName} browserName
 * @returns {'chromium'|'firefox'|'webkit'}
 */
function getProductName(browserName) {
    switch (browserName) {
        case 'chrome':
        case 'chrome-beta':
        case 'chrome-dev':
        case 'msedge':
        case 'msedge-beta':
        case 'msedge-dev':
            return 'chromium';
        default:
            return browserName;
    }
}

/**
 * Create test launchers.
 * @param {string[]} requestedBrowsers
 */
export async function loadLaunchers(requestedBrowsers) {
    const browsers = normalizeBrowserNames(requestedBrowsers);

    /**
     * @type {(args: { browser: import('playwright').Browser }) => Promise<import('playwright').BrowserContext>}
     */
    const createBrowserContext = ({ browser }) => browser.newContext();
    /**
     * @type {(args: { context: import('playwright').BrowserContext }) => Promise<import('playwright').Page>}
     */
    const createPage = ({ context }) => context.newPage();

    const browserNames = browsers.length ? browsers : (/** @type {BrowserName[]} */ (['chrome']));

    return Promise.all(
        browserNames.map(async (browserName) => {
            if (browserName === 'chrome') {
                const chromeRunner = await (import('@web/test-runner-chrome').catch(() => null));
                if (chromeRunner) {
                    return chromeRunner.chromeLauncher({
                        launchOptions: {
                            args: ['--no-sandbox'],
                        },
                    });
                }
            }

            const launcher = new PlaywrightLauncher(getProductName(browserName), { channel: browserName }, createBrowserContext, createPage);
            launcher.name = browserName;

            return launcher;
        })
    );
}
