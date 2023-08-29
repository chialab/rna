import process from 'process';
import { readConfigFile, mergeConfig, locateConfigFile } from '@chialab/rna-config-loader';
import { createLogger } from '@chialab/rna-logger';
import { test } from '@chialab/rna-saucelabs-test-runner';

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
export default function(program) {
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
                const config = mergeConfig({ root }, configFile ? await readConfigFile(configFile, { root }, 'serve') : {});

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
                };

                if (specs.length) {
                    testRunnerConfig.files = specs;
                }

                await test(testRunnerConfig, { user, key });
            }
        );
}
