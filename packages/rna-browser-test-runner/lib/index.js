import path from 'path';
import { createRequire } from 'module';
import { readConfigFile, mergeConfig, locateConfigFile } from '@chialab/rna-config-loader';
import { createLogger } from '@chialab/rna-logger';
import { mochaReporter } from '@chialab/wtr-mocha-reporter';
import { HELPERS_PATH } from '@chialab/wds-plugin-node-resolve';
import { FRAMEWORK_ALIASES } from './frameworks.js';
import { TestRunner, TestRunnerCli } from '@web/test-runner-core';
import { buildMiddlewares, buildPlugins } from '@chialab/rna-dev-server';

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
        reporters: [
            mochaReporter(),
        ],
        testFramework,
        open: false,
        browserLogs: true,
        ...(/** @type {*} */ (config)),
        port: config.port || 8080,
        middleware: [
            ...buildMiddlewares(),
            ...(config.middleware || []),
        ],
        plugins: [
            ...buildPlugins({
                ...config,
                alias: {
                    ...FRAMEWORK_ALIASES,
                    ...(config.alias || {}),
                },
            }),
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

async function loadLaunchers() {
    try {
        const { puppeteerLauncher } = await import('@web/test-runner-puppeteer');
        return [
            puppeteerLauncher({
                launchOptions: {
                    args: ['--no-sandbox'],
                },
            }),
        ];
    } catch (err) {
        //
    }
    try {
        const { playwrightLauncher } = await import('@web/test-runner-playwright');
        return [
            playwrightLauncher({ product: 'chromium' }),
            playwrightLauncher({ product: 'firefox' }),
            playwrightLauncher({ product: 'webkit' }),
        ];
    } catch (err) {
        //
    }

    const { chromeLauncher } = await import('@web/test-runner-chrome');
    return [
        chromeLauncher({
            launchOptions: {
                args: ['--no-sandbox'],
            },
        }),
    ];
}

/**
 * @typedef {Object} TestBrowserCommandOptions
 * @property {number} [port]
 * @property {boolean} [watch]
 * @property {number} [concurrency]
 * @property {boolean} [coverage]
 * @property {boolean} [manual]
 * @property {boolean} [open]
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
                    browsers: await loadLaunchers(),
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
