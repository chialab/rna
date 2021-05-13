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
     * @type {import('@web/test-runner').BrowserLauncher[]|undefined}
     */
    let launchers = undefined;
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

        /**
         * @type {string[]}
         */
        const browsers = typeof config.saucelabs === 'boolean' ?
            JSON.parse(await readFile(new URL('./browsers.json', import.meta.url), 'utf-8')) :
            config.saucelabs;

        /**
         * @param {string} browser
         */
        const getLauncherData = (browser) => {
            const chunks = browser.split(' ');
            const browserVersion = chunks.pop();

            let browserName = chunks.join(' ').toLowerCase();

            /**
             * @type {*}
             */
            const config = {
                browserVersion,
                browserName,
            };
            switch (browserName) {
                case 'ie': {
                    config.browserName = 'internet explorer';
                    config.platformName = 'Windows 10';
                    break;
                }
                case 'edge':
                case 'ms edge':
                case 'microsoftedge':
                case 'microsoft edge': {
                    config.browserName = 'MicrosoftEdge';
                    config.platformName = 'Windows 10';
                    break;
                }
                case 'chrome':
                case 'google chrome':
                case 'chromium': {
                    config.browserName = 'chrome';
                    config.platformName = 'Windows 10';
                    break;
                }
                case 'firefox':
                case 'ff': {
                    config.browserName = 'firefox';
                    config.platformName = 'Windows 10';
                    break;
                }
                case 'ios':
                case 'iphone':
                case 'ios_safari': {
                    delete config.browserVersion;
                    config.browserName = 'Safari';
                    config.platformName = 'iOS';
                    config.version = browserVersion;
                    config.platformVersion = browserVersion;
                    config.deviceName = 'iPhone 8 Simulator';
                    break;
                }
                case 'and_chr':
                case 'and_uc':
                case 'samsung':
                case 'android': {
                    delete config.browserVersion;
                    config.browserName = 'Chrome';
                    config.platformName = 'Android';
                    config.version = browserVersion;
                    config.platformVersion = browserVersion;
                    config.deviceName = 'Android GoogleAPI Emulator';
                    break;
                }
            }

            return config;
        };

        launchers = [
            ...(launchers || []),
            ...browsers.map((browser) => sauceLabsLauncher(getLauncherData(browser))),
        ];
    }

    return startTestRunner({
        readCliArgs: false,
        readFileConfig: false,
        autoExitProcess: true,
        config: {
            browserStartTimeout: 2 * 60 * 1000,
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
            ...config,
            browsers: launchers,
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
        },
    });
}

/**
 * @param {import('commander').Command} program
 */
export function command(program) {
    program
        .command('test:browser [specs...]')
        .description('Start a browser test runner (https://modern-web.dev/docs/test-runner/overview/) based on the web dev server. It uses mocha (https://mochajs.org/) but you still need to import an assertion library (recommended https://open-wc.org/docs/testing/testing-package/).')
        .option('-W, --watch', 'watch test files')
        .option('-C, --coverage', 'add coverage to tests')
        .option('-O, --open', 'open the browser')
        .option('--saucelabs [browsers...]', 'run tests using Saucelabs browsers')
        .action(
            /**
             * @param {string[]} specs
             * @param {{ watch?: boolean, coverage?: boolean, open?: boolean, saucelabs?: boolean|string[] }} options
             */
            async (specs, { watch, coverage, open, saucelabs }) => {
                /**
                 * @type {import('@web/test-runner').TestRunnerPlugin[]}
                 */
                const plugins = [];

                /**
                 * @type {TestRunnerConfig}
                 */
                const config = {
                    watch,
                    coverage,
                    open,
                    manual: open ? true : undefined,
                    saucelabs,
                    plugins,
                };
                if (specs.length) {
                    config.files = specs;
                }
                try {
                    const { legacyPlugin } = await import('@web/dev-server-legacy');
                    plugins.push(legacyPlugin({
                        polyfills: {
                            coreJs: false,
                            regeneratorRuntime: true,
                            webcomponents: false,
                            fetch: true,
                            abortController: false,
                            intersectionObserver: false,
                            resizeObserver: false,
                            dynamicImport: true,
                            systemjs: true,
                            shadyCssCustomStyle: false,
                            esModuleShims: true,
                        },
                    }));
                } catch (err) {
                    //
                }
                await test(config);
            }
        );
}
