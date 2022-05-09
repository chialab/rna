import path from 'path';
import { createRequire } from 'module';
import { readConfigFile, mergeConfig, locateConfigFile } from '@chialab/rna-config-loader';
import { createLogger } from '@chialab/rna-logger';
import { mochaReporter } from '@chialab/wtr-mocha-reporter';
import { HELPERS_PATH } from '@chialab/wds-plugin-node-resolve';
import { FRAMEWORK_ALIASES } from './frameworks.js';
import { TestRunner, TestRunnerCli } from '@web/test-runner-core';
import { loadDevServerConfig, createDevServer } from '@chialab/rna-dev-server';

const require = createRequire(import.meta.url);

export { TestRunner };

/**
 * @typedef {Object} TestRunnerCoreConfig
 * @property {import('@chialab/rna-logger').Logger} [logger]
 * @property {string[]|import('@web/test-runner-core').BrowserLauncher[]} [browsers]
 * @property {import('@chialab/node-resolve').AliasMap} [alias]
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
 */
export async function startTestRunner(config) {
    const devServerConfig = await loadDevServerConfig({
        ...config,
        alias: {
            ...FRAMEWORK_ALIASES,
            ...(config.alias || {}),
        },
    });
    const devServer = await createDevServer(devServerConfig);

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
        concurrency: 2,
        concurrentBrowsers: 2,
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
            reporters: ['lcov', 'text-summary'],
        },
        reporters: [mochaReporter()],
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
 * @return {Promise<TestRunner>} The test runner instance.
 */
export async function test(config) {
    const { runner, cli } = await startTestRunner(config);

    await runner.start();
    cli.start();

    process.on('uncaughtException', (error) => {
        config.logger?.error(error);
        runner.stop();
    });

    process.on('exit', () => {
        runner.stop();
    });

    process.on('SIGINT', () => {
        runner.stop();
    });

    runner.on('stopped', (passed) => {
        process.exit(passed ? 0 : 1);
    });

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
 * Create a chromium launcher using puppeteer or playwright if available.
 * @returns A launcher.
 */
async function createChromiumLauncher() {
    try {
        const { puppeteerLauncher } = await import('@web/test-runner-puppeteer');
        return puppeteerLauncher({
            launchOptions: {
                args: ['--no-sandbox'],
            },
        });
    } catch (err) {
        //
    }
    try {
        const { playwrightLauncher } = await import('@web/test-runner-playwright');
        return playwrightLauncher({
            product: 'chromium',
        });
    } catch (err) {
        //
    }

    const { chromeLauncher } = await import('@web/test-runner-chrome');
    return chromeLauncher({
        launchOptions: {
            args: ['--no-sandbox'],
        },
    });
}

/**
 * Create test launchers.
 * @param {string[]} requestedBrowsers
 */
async function loadLaunchers(requestedBrowsers) {
    const browsers = normalizeBrowserNames(requestedBrowsers);

    try {
        const { PlaywrightLauncher } = await import('@web/test-runner-playwright');

        /**
         * @type {(args: { browser: import('playwright').Browser }) => Promise<import('playwright').BrowserContext>}
         */
        const createBrowserContext = ({ browser }) => browser.newContext();
        /**
         * @type {(args: { context: import('playwright').BrowserContext }) => Promise<import('playwright').Page>}
         */
        const createPage = ({ context }) => context.newPage();

        const playwrightBrowsers = browsers.length ? browsers : (/** @type {BrowserName[]} */ (['chrome', 'msedge', 'firefox', 'webkit']));

        return playwrightBrowsers.map((browserName) => {
            const launcher = new PlaywrightLauncher(getProductName(browserName), { channel: browserName }, createBrowserContext, createPage);
            launcher.name = browserName;

            return launcher;
        });
    } catch (err) {
        //
    }

    if (browsers.length) {
        return await Promise.all(browsers.map((browserName) => {
            switch (browserName) {
                case 'chromium':
                    return createChromiumLauncher();
                default:
                    throw new Error(`Unknown launcher for browser: ${browserName}`);
            }
        }));
    }

    return [await createChromiumLauncher()];
}

/**
 * @typedef {Object} TestBrowserCommandOptions
 * @property {number} [port]
 * @property {boolean} [watch]
 * @property {number} [concurrency]
 * @property {boolean} [coverage]
 * @property {boolean} [manual]
 * @property {boolean} [open]
 * @property {string[]} [browsers]
 * @property {string} [config]
 */

/**
 * @param {import('commander').Command} program
 */
export function command(program) {
    program
        .command('test:browser [specs...]')
        .description('Start a browser test runner (https://modern-web.dev/docs/test-runner/overview/) based on the web dev server. It uses mocha (https://mochajs.org/) but you still need to import an assertion library (recommended https://open-wc.org/docs/testing/testing-package/).')
        .option('-P, --port <number>', 'dev server port', parseInt)
        .option('--watch', 'watch test files')
        .option('--concurrency <number>', 'number of concurrent browsers', parseInt)
        .option('--manual', 'manual test mode')
        .option('--open', 'open the browser')
        .option('--coverage', 'add coverage to tests')
        .option('--browsers <items>', 'comma separated list of browsers', (val) => val.split(',').map((val) => val.trim()))
        .option('-C, --config <path>', 'the rna config file')
        .action(
            /**
             * @param {string[]} specs
             * @param {TestBrowserCommandOptions} options
             */
            async (specs, {
                port,
                watch,
                concurrency,
                coverage,
                manual,
                open,
                browsers = [],
                config: configFile,
            }) => {
                const root = process.cwd();
                configFile = configFile || await locateConfigFile();

                const logger = createLogger();

                /**
                 * @type {import('@chialab/rna-config-loader').Config}
                 */
                const config = mergeConfig({ root }, configFile ? await readConfigFile(configFile, { root }, 'serve') : {});

                /**
                 * @type {TestRunnerPlugin[]}
                 */
                const plugins = [];

                /**
                 * @type {TestRunnerConfig}
                 */
                const testRunnerConfig = {
                    rootDir: config.root,
                    port: port || 8765,
                    watch,
                    concurrentBrowsers: concurrency || 2,
                    coverage,
                    manual: manual || open === true,
                    open,
                    alias: config.alias,
                    plugins,
                    logger,
                    browsers: await loadLaunchers(browsers),
                };

                if (specs.length) {
                    testRunnerConfig.files = specs;
                }

                try {
                    const { legacyPlugin } = await import('@chialab/wds-plugin-legacy');
                    plugins.push(legacyPlugin({
                        minify: true,
                    }));
                } catch (err) {
                    //
                }

                await test(testRunnerConfig);
            }
        );
}
