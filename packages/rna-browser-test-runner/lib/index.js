/**
 * Start the test runner.
 * @param {Partial<import('@web/test-runner').TestRunnerConfig>} config
 * @return {Promise<import('@web/test-runner').TestRunner|undefined>} The test runner instance.
 */
export async function test(config) {
    const { startTestRunner } = await import('@web/test-runner');
    const { esbuildPlugin } = await import('@web/dev-server-esbuild');
    const { fromRollup } = await import('@web/dev-server-rollup');
    const { default: rollupCommonjs } = await import('@rollup/plugin-commonjs');
    const { cssPlugin } = await import('@chialab/wds-plugin-postcss');
    const { defineEnvVariables } = await import('@chialab/esbuild-plugin-env');
    const commonjsPlugin = fromRollup(rollupCommonjs);

    let testFramework =
        /**
         * @type {import('@web/test-runner').TestFramework}
         */
        ({
            config: {
                ui: 'bdd',
                timeout: '10000',
            },
        });

    return startTestRunner({
        readCliArgs: false,
        readFileConfig: false,
        autoExitProcess: true,
        config: {
            files: [
                'test/**/*.test.js',
                'test/**/*.spec.js',
            ],
            testFramework,
            nodeResolve: {
                exportConditions: ['default', 'module', 'import', 'require'],
                mainFields: ['umd:main', 'module', 'browser', 'jsnext', 'jsnext:main', 'main'],
            },
            preserveSymlinks: true,
            open: false,
            ...config,
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
                commonjsPlugin({
                    ignoreTryCatch: true,
                    exclude: [
                        'node_modules/chai/chai.js',
                        'node_modules/chai-dom/chai-dom.js',
                    ],
                }),
                ...(config.plugins || []),
            ],
        },
    });
}
