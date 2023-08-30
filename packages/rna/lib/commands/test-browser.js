import process from 'process';
import { readConfigFile, mergeConfig, locateConfigFile } from '@chialab/rna-config-loader';
import { createLogger } from '@chialab/rna-logger';
import { loadLaunchers, test } from '@chialab/rna-browser-test-runner';

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
export default function(program) {
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
                const config = mergeConfig({ root }, configFile ? await readConfigFile(configFile, { root }, 'serve') : {});

                /**
                 * @type {import('@chialab/rna-browser-test-runner').TestRunnerConfig}
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
                    plugins: [],
                    browsers: /** @type {import('@chialab/rna-browser-test-runner').BrowserLauncher[]} */ (await loadLaunchers(browsers)),
                };

                if (specs.length) {
                    testRunnerConfig.files = specs;
                }

                const runner = await test(testRunnerConfig, logger);

                process.on('uncaughtException', (error) => {
                    logger.error(error);
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
            }
        );
}
