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
            throw new Error('Missing saucelabs runner. Did you forget to install the `@web/test-runner-saucelabs` package?')
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
            sauceLabsCapabilities
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
                case 'microsoftedge':
                case 'microsoft edge': {
                    config.browserName = 'Microsoft Edge';
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
                case 'iphone':
                case 'ios_safari': {
                    config.browserName = 'iphone';
                    config.platform = 'iPhone X Simulator';
                    break;
                }
                case 'android': {
                    config.browserName = 'Android GoogleAPI Emulator';
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
            testRunnerHtml: testFramework => `<html>
                <body>
                    <script type="module">
                        document.addEventListener('DOMContentLoaded', () => import('${testFramework}'));
                    </script>
                </body>
            </html>`,
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
