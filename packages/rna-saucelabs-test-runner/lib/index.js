import { readConfigFile, mergeConfig, locateConfigFile } from '@chialab/rna-config-loader';
import { createLogger } from '@chialab/rna-logger';

/**
 * Start the test runner.
 * @param {import('@chialab/rna-browser-test-runner').TestRunnerConfig} config
 * @param {import('saucelabs').SauceLabsOptions} sauceOptions
 * @return {Promise<import('@chialab/rna-browser-test-runner').TestRunner>} The test runner instance.
 */
export async function test(config, sauceOptions) {
    const { default: path } = await import('path');
    const { promises: { readFile } } = await import('fs');
    const { default: pkgUp } = await import('pkg-up');
    const { createSauceLabsLauncher } = await import('@web/test-runner-saucelabs');
    const { test: coreTest } = await import('@chialab/rna-browser-test-runner');
    const { mochaReporter } = await import('@chialab/wtr-mocha-reporter');
    const { fixLauncher } = await import('./fixLauncher.js');
    const { testName, testJob } = await import('./info.js');
    const { sauceReporter } = await import('./reporter.js');
    config = { ...config };

    const packageFile = await pkgUp();
    const packageJson = packageFile ? JSON.parse(await readFile(packageFile, 'utf-8')) : {};
    const sauceCapabilities = {
        name: testName(packageJson.name || path.basename(process.cwd())),
        build: testJob(),
    };

    const sauceLabsLauncher = createSauceLabsLauncher(sauceOptions, sauceCapabilities, { noSslBumpDomains: 'all' });
    const { getSauceCapabilities } = await import('./getSauceLauncherData.js');

    /**
     * @type {string[]}
     */
    const browsers = [];
    if (!config.browsers || config.browsers.length == 0) {
        browsers.push(
            ...(JSON.parse(await readFile(new URL('./browsers/modern.json', import.meta.url), 'utf-8')))
        );
    }
    if (Array.isArray(config.browsers)) {
        let list = [...(/** @type {string[]} */ (config.browsers))];
        if (list.includes('modern')) {
            browsers.push(
                ...(JSON.parse(await readFile(new URL('./browsers/modern.json', import.meta.url), 'utf-8')))
            );
            list = list.filter((entry) => entry !== 'modern');
        }
        if (list.includes('legacy')) {
            browsers.push(
                ...(JSON.parse(await readFile(new URL('./browsers/legacy.json', import.meta.url), 'utf-8')))
            );
            list = list.filter((entry) => entry !== 'legacy');
        }

        browsers.push(...list);
    }

    config.browsers = [
        ...browsers.map((browser) => fixLauncher(sauceLabsLauncher(getSauceCapabilities(browser)))),
    ];
    config.browserLogs = false;
    config.concurrency = 1;
    config.testsStartTimeout = Math.max(3 * 60 * 1000, config.testsStartTimeout || 0);
    config.testsFinishTimeout = Math.max(3 * 60 * 1000, config.testsFinishTimeout || 0);
    config.reporters = [
        mochaReporter(),
        sauceReporter(sauceOptions),
    ];

    return coreTest(config);
}

/**
 * @typedef {Object} TestSaucelabsCommandOptions
 * @property {number} [port]
 * @property {boolean} [watch]
 * @property {number} [concurrency]
 * @property {boolean} [coverage]
 * @property {boolean} [manual]
 * @property {boolean} [open]
 * @property {string[]} [browsers]
 * @property {string} [config]
 * @property {string} [user]
 * @property {string} [key]
 */

/**
 * @param {import('commander').Command} program
 */
export function command(program) {
    program
        .command('test:saucelabs [specs...]')
        .description('Start a Saucelabs browser test runner (https://modern-web.dev/docs/test-runner/overview/) based on the web dev server. It uses mocha (https://mochajs.org/) but you still need to import an assertion library (recommended https://open-wc.org/docs/testing/testing-package/).')
        .option('-P, --port <number>', 'dev server port', parseInt)
        .option('--browsers [browsers...]', 'saucelabs browsers list')
        .option('--watch', 'watch test files')
        .option('--concurrency <number>', 'number of concurrent browsers', parseInt)
        .option('--manual', 'manual test mode')
        .option('--open', 'open the browser')
        .option('--coverage', 'add coverage to tests')
        .option('-C, --config <path>', 'the rna config file')
        .option('-U, --user <string>', 'sauce username')
        .option('-K, --key <string>', 'sauce access key')
        .action(
            /**
             * @param {string[]} specs
             * @param {TestSaucelabsCommandOptions} options
             */
            async (specs, {
                port,
                watch,
                concurrency,
                coverage,
                manual,
                open,
                browsers,
                config: configFile,
                user = process.env.SAUCE_USERNAME,
                key = process.env.SAUCE_ACCESS_KEY,
            }) => {
                if (!user) {
                    throw new Error('Missing saucelabs username. Did you forget to set the `SAUCE_USERNAME` environment variable?');
                }
                if (!key) {
                    throw new Error('Missing saucelabs access key. Did you forget to set the `SAUCE_ACCESS_KEY` environment variable?');
                }

                const root = process.cwd();
                configFile = configFile || await locateConfigFile();

                const logger = createLogger();

                /**
                 * @type {import('@chialab/rna-config-loader').Config}
                 */
                const config = mergeConfig({ root }, configFile ? await readConfigFile(configFile, { root }, 'serve') : {});

                const { legacyPlugin } = await import('@chialab/wds-plugin-legacy');

                /**
                 * @type {import('@chialab/rna-browser-test-runner').TestRunnerConfig}
                 */
                const testRunnerConfig = {
                    rootDir: config.root,
                    port: port || 8765,
                    watch,
                    logger,
                    concurrentBrowsers: concurrency || 2,
                    coverage,
                    manual: manual || open === true,
                    open,
                    alias: config.alias,
                    browsers,
                    plugins: [
                        legacyPlugin({
                            minify: true,
                        }),
                    ],
                };

                if (specs.length) {
                    testRunnerConfig.files = specs;
                }

                await test(testRunnerConfig, { user, key });
            }
        );
}
