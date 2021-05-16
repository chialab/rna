/**
 * @typedef {Partial<Omit<import('@web/test-runner').TestRunnerConfig, 'browsers'>> & { browsers?: string[]|import('@web/test-runner').BrowserLauncher[] }} TestRunnerConfig
 */

/**
 * Start the test runner.
 * @param {TestRunnerConfig} config
 * @return {Promise<import('@web/test-runner').TestRunner|undefined>} The test runner instance.
 */
export async function test(config) {
    const { startTestRunner, defaultReporter } = await import('@web/test-runner');
    const { esbuildPlugin } = await import('@web/dev-server-esbuild');
    const { commonjsPlugin } = await import('@chialab/wds-plugin-commonjs');
    const { cssPlugin } = await import('@chialab/wds-plugin-postcss');
    const { defineEnvVariables } = await import('@chialab/esbuild-plugin-env');
    const { default: cors } = await import('@koa/cors');
    const { default: range } = await import('koa-range');

    const testFramework =
        /**
         * @type {import('@web/test-runner').TestFramework}
         */
        ({
            config: {
                ui: 'bdd',
                timeout: '10000',
            },
        });

    /**
     * @type {import('@web/test-runner').TestRunnerConfig}
     */
    const runnerConfig = {
        browserStartTimeout: 2 * 60 * 1000,
        concurrency: 2,
        concurrentBrowsers: 2,
        files: [
            'test/**/*.test.js',
            'test/**/*.spec.js',
        ],
        reporters: [
            defaultReporter({
                reportTestProgress: true,
                reportTestResults: true,
            }),
        ],
        testFramework,
        nodeResolve: {
            exportConditions: ['default', 'module', 'import', 'browser'],
            mainFields: ['umd:main', 'module', 'esnext', 'browser', 'jsnext', 'jsnext:main', 'main'],
        },
        preserveSymlinks: true,
        open: false,
        ...(/** @type {*} */ (config)),
        middleware: [
            cors(),
            range,
        ],
        plugins: [
            cssPlugin(),
            esbuildPlugin({
                loaders: {
                    '.cjs': 'tsx',
                    '.mjs': 'tsx',
                    '.jsx': 'tsx',
                    '.ts': 'tsx',
                    '.tsx': 'tsx',
                    '.json': 'json',
                    '.geojson': 'json',
                },
                define: {
                    ...defineEnvVariables(),
                },
            }),
            commonjsPlugin(),
            ...(config.plugins || []),
        ],
    };

    return startTestRunner({
        readCliArgs: false,
        readFileConfig: false,
        autoExitProcess: true,
        config: runnerConfig,
    });
}

/**
 * @param {import('commander').Command} program
 */
export function command(program) {
    program
        .command('test:browser [specs...]')
        .description('Start a browser test runner (https://modern-web.dev/docs/test-runner/overview/) based on the web dev server. It uses mocha (https://mochajs.org/) but you still need to import an assertion library (recommended https://open-wc.org/docs/testing/testing-package/).')
        .option('-P, --port', 'web server port')
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
                 * @type {import('@web/test-runner').TestRunnerPlugin[]}
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
