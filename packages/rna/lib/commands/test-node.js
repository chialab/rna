import process from 'process';
import { locateConfigFile, mergeConfig, readConfigFile } from '@chialab/rna-config-loader';
import { test } from '@chialab/rna-node-test-runner';

/**
 * @typedef {Object} TestNodeCommandOptions
 * @property {boolean} [coverage]
 * @property {string} [config]
 */

/**
 * @param {import('commander').Command} program
 */
export default function (program) {
    program
        .command('test:node [specs...]')
        .description('Start a node test runner based on mocha.')
        .option('--coverage', 'collect code coverage')
        .option('-C, --config <path>', 'the rna config file')
        .action(
            /**
             * @param {string[]} specs
             * @param {TestNodeCommandOptions} options
             */
            async (specs, { coverage, config: configFile }) => {
                const root = process.cwd();
                configFile = configFile || (await locateConfigFile());

                /**
                 * @type {import('@chialab/rna-config-loader').ProjectConfig}
                 */
                const config = mergeConfig(
                    { root },
                    configFile ? await readConfigFile(configFile, { root }, 'serve') : {}
                );

                /**
                 * @type {import('@chialab/rna-node-test-runner').TestRunnerConfig}
                 */
                const testRunnerConfig = {
                    alias: config.alias,
                    coverage,
                };
                if (specs.length) {
                    testRunnerConfig.files = specs;
                }
                await test(testRunnerConfig);
            }
        );
}
