/**
 * @typedef {Partial<Omit<import('@web/test-runner-core').TestRunnerCoreConfig, 'browsers'>> & { browsers?: string[]|import('@web/test-runner-core').BrowserLauncher[] }} TestRunnerConfig
 */

/**
 * @typedef {import('@web/test-runner-core').TestRunner} TestRunner
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
 * @return {Promise<TestRunner>} The test runner instance.
 */
export async function startTestRunner(config) {
    const [
        { TestRunner },
        { buildMiddlewares, buildPlugins },
    ] = await Promise.all([
        import('@web/test-runner-core'),
        import('@chialab/rna-dev-server'),
    ]);
    // const { defaultReporter } = await import('@web/test-runner-core');
    const testFramework =
        /**
         * @type {TestFramework}
         */
        ({
            config: {
                ui: 'bdd',
                timeout: '10000',
            },
        });

    /**
     * @type {import('@web/test-runner-core').TestRunnerCoreConfig}
     */
    const runnerConfig = {
        browserStartTimeout: 2 * 60 * 1000,
        concurrency: 2,
        concurrentBrowsers: 2,
        files: [
            'test/**/*.test.js',
            'test/**/*.spec.js',
        ],
        // reporters: [
        //     defaultReporter({
        //         reportTestProgress: true,
        //         reportTestResults: true,
        //     }),
        // ],
        testFramework,
        open: false,
        ...(/** @type {*} */ (config)),
        middleware: [
            ...(await buildMiddlewares()),
            ...(config.middleware || []),
        ],
        plugins: [
            ...(await buildPlugins()),
            ...(config.plugins || []),
        ],
    };

    return new TestRunner(runnerConfig);
}

/**
 * Start the test runner.
 * @param {TestRunnerConfig} config
 * @return {Promise<TestRunner>} The test runner instance.
 */
export async function test(config) {
    const runner = await startTestRunner(config);

    await runner.start();

    process.on('uncaughtException', error => {
        // eslint-disable-next-line no-console
        console.error(error);
    });

    process.on('SIGINT', async () => {
        await runner.stop();
        process.exit(0);
    });

    return runner;
}

/**
 * @param {import('commander').Command} program
 */
export function command(program) {
    program
        .command('test:browser [specs...]')
        .description('Start a browser test runner (https://modern-web.dev/docs/test-runner/overview/) based on the web dev server. It uses mocha (https://mochajs.org/) but you still need to import an assertion library (recommended https://open-wc.org/docs/testing/testing-package/).')
        .option('-P, --port', 'dev server port')
        .option('--watch', 'watch test files')
        .option('--concurrency <number>', 'number of concurrent browsers', parseInt)
        .option('--manual', 'manual test mode')
        .option('--open', 'open the browser')
        .option('--coverage', 'add coverage to tests')
        .action(
            /**
             * @param {string[]} specs
             * @param {{ port?: number, watch?: boolean, concurrency?: number, coverage?: boolean, manual?: boolean; open?: boolean }} options
             */
            async (specs, { port, watch, concurrency, coverage, manual, open }) => {
                /**
                 * @type {TestRunnerPlugin[]}
                 */
                const plugins = [];

                /**
                 * @type {TestRunnerConfig}
                 */
                const config = {
                    port,
                    watch,
                    concurrentBrowsers: concurrency || 2,
                    coverage,
                    manual: manual || open === true,
                    open,
                    plugins,
                };

                if (specs.length) {
                    config.files = specs;
                }

                try {
                    const { legacyPlugin } = await import('@chialab/wds-plugin-legacy');
                    plugins.push(legacyPlugin({
                        minify: true,
                    }));
                } catch (err) {
                    //
                }

                await test(config);
            }
        );
}
