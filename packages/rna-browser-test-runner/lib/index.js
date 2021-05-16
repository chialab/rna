/**
 * @typedef {Partial<import('@web/test-runner').TestRunnerConfig> & { saucelabs?: string[]|boolean }} TestRunnerConfig
 */

/**
 * Start the test runner.
 * @param {TestRunnerConfig} config
 * @return {Promise<import('@web/test-runner').TestRunner|undefined>} The test runner instance.
 */
export async function test(config) {
    const { startTestRunner } = await import('@web/test-runner');
    const { esbuildPlugin } = await import('@web/dev-server-esbuild');
    const { commonjsPlugin } = await import('@chialab/wds-plugin-commonjs');
    const { cssPlugin } = await import('@chialab/wds-plugin-postcss');
    const { defineEnvVariables } = await import('@chialab/esbuild-plugin-env');
    const { default: cors } = await import('@koa/cors');
    const { default: range } = await import('koa-range');
    const { testName, testJob } = await import('./ci.js');

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

    if (config.saucelabs) {
        const { default: path } = await import('path');
        const { promises: { readFile } } = await import('fs');
        const { default: pkgUp } = await import('pkg-up');

        /**
         * @type {typeof import('@web/test-runner-saucelabs').createSauceLabsLauncher}
         */
        let createSauceLabsLauncher;
        try {
            createSauceLabsLauncher = (await import('@web/test-runner-saucelabs')).createSauceLabsLauncher;
        } catch (err) {
            throw new Error('Missing saucelabs runner. Did you forget to install the `@web/test-runner-saucelabs` package?');
        }

        const packageFile = await pkgUp();
        const packageJson = packageFile ? JSON.parse(await readFile(packageFile, 'utf-8')) : {};
        const sauceLabsCapabilities = {
            name: testName(packageJson.name || path.basename(process.cwd())),
            build: testJob(),
        };

        if (!process.env.SAUCE_USERNAME) {
            throw new Error('Missing saucelabs username. Did you forget to set the `SAUCE_USERNAME` environment variable?');
        }
        if (!process.env.SAUCE_ACCESS_KEY) {
            throw new Error('Missing saucelabs access key. Did you forget to set the `SAUCE_ACCESS_KEY` environment variable?');
        }
        const sauceLabsLauncher = createSauceLabsLauncher(
            {
                user: process.env.SAUCE_USERNAME || '',
                key: process.env.SAUCE_ACCESS_KEY || '',
            },
            sauceLabsCapabilities,
            { noSslBumpDomains: 'all' }
        );
        const { getSauceCapabilities } = await import('./getSauceLauncherData.js');

        /**
         * @type {string[]}
         */
        const browsers = typeof config.saucelabs === 'boolean' ?
            JSON.parse(await readFile(new URL('./browsers.json', import.meta.url), 'utf-8')) :
            config.saucelabs;

        runnerConfig.browsers = [
            ...(runnerConfig.browsers || []),
            ...browsers.map((browser) => sauceLabsLauncher(getSauceCapabilities(browser))),
        ];
        runnerConfig.browserLogs = false;
        runnerConfig.concurrency = 1;
        runnerConfig.testsStartTimeout = 3 * 60 * 1000;
        runnerConfig.testsFinishTimeout = 3 * 60 * 1000;
    }

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
        .option('--saucelabs [browsers...]', 'run tests using Saucelabs browsers')
        .action(
            /**
             * @param {string[]} specs
             * @param {{ port?: number, watch?: boolean, concurrency?: number, coverage?: boolean, manual?: boolean; open?: boolean, saucelabs?: boolean|string[] }} options
             */
            async (specs, { port, watch, concurrency, coverage, manual, open, saucelabs }) => {
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
                    saucelabs,
                    plugins,
                };

                if (specs.length) {
                    config.files = specs;
                }

                try {
                    const { legacyPlugin } = await import('@chialab/wds-plugin-legacy');
                    const plugin = legacyPlugin();
                    try {
                        const { inject } = await import('@chialab/wds-plugin-polyfill');
                        inject(plugin, {
                            minify: true,
                            features: {
                                'es6': {},
                                'URL': {},
                                'URL.prototype.toJSON': {},
                                'URLSearchParams': {},
                                'Promise': {},
                                'Promise.prototype.finally': {},
                                'fetch': {},
                            },
                        });
                    } catch (err) {
                        //
                    }
                    plugins.push(plugin);
                } catch (err) {
                    //
                }

                await test(config);
            }
        );
}
