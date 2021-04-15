import path from 'path';
import { promises } from 'fs';
import { loaders } from './helpers/loaders.js';
import { camelize } from './helpers/camelize.js';
import { saveManifestJson } from './helpers/saveManifestJson.js';
import { saveEndpointsJson, saveDevEndpointsJson } from './helpers/saveEndpointsJson.js';
import { emptyDir } from './helpers/emptyDir.js';

const { stat, readFile } = promises;

export { loaders };

/**
 * @typedef {Object} JSXOptions
 * @property {string} pragma The jsx pragma to use.
 * @property {string} [pragmaFrag] The jsx pragma to use for fragments.
 */

/**
 * @typedef {Omit<import('esbuild').BuildOptions, 'loader'> & { output: string, root?: string, input?: string|string[], code?: string, loader?: import('esbuild').Loader, name?: string, jsx?: JSXOptions, metafile?: boolean|string, clean?: boolean }} BuildConfig
 */

/**
 * @typedef {import('esbuild').BuildResult & { outputFiles?: import('esbuild').OutputFile[] }} BuildResult
 */

/**
 * Build and bundle sources.
 * @param {BuildConfig} config
 * @return {Promise<BuildResult>} The esbuild bundle result.
 */
export async function build(config) {
    const { default: esbuild } = await import('esbuild');
    const { default: pkgUp } = await import('pkg-up');
    const { default: browserslist } = await import('browserslist');
    const { defineEnvVariables } = await import('./helpers/define.js');

    let {
        root = process.cwd(),
        input,
        code,
        output,
        loader = 'tsx',
        format = 'esm',
        platform = format === 'cjs' ? 'node' : 'browser',
        globalName = camelize(output),
        jsx,
        target,
        publicPath,
        entryNames = '[name]',
        metafile = false,
        clean = false,
        bundle = false,
        sourcemap = true,
        minify = false,
        watch = false,
    } = config;

    let hasOutputFile = !!path.extname(output);
    let outputDir = hasOutputFile ? path.dirname(output) : output;
    if (clean) {
        await emptyDir(outputDir);
    }

    target = target ?
        browserslist(target)
            .filter((entry) => ['chrome', 'firefox', 'safari', 'edge', 'node'].includes(entry.split(' ')[0]))
            .map((entry) => entry.split(' ').join('')) :
        ['es2020'];

    let entryOptions = {};
    if (code) {
        entryOptions.stdin = {
            contents: code,
            loader: /** @type {import('esbuild').Loader} */ (`${loader}`),
            resolveDir: root,
            sourcefile: Array.isArray(input) ? input[0] : input,
        };
    } else if (input) {
        entryOptions.entryPoints = Array.isArray(input) ? input : [input];
    }

    /**
     * @type {string[]}
     */
    let external = [];
    if (!bundle) {
        let packageFile = await pkgUp({
            cwd: root,
        });
        if (packageFile) {
            let packageJson = JSON.parse(await readFile(packageFile, 'utf-8'));
            external = [
                ...external,
                ...Object.keys(packageJson.dependencies || {}),
                ...Object.keys(packageJson.peerDependencies || {}),
            ];
        }
    }

    let result = await esbuild.build({
        ...entryOptions,
        globalName,
        define: {
            ...defineEnvVariables(),
        },
        outfile: hasOutputFile ? output : undefined,
        outdir: hasOutputFile ? undefined : output,
        entryNames,
        assetNames: entryNames,
        splitting: format === 'esm' && !hasOutputFile,
        target,
        bundle: true,
        sourcemap,
        minify,
        platform,
        format,
        external,
        metafile,
        jsxFactory: jsx && jsx.pragma || undefined,
        jsxFragment: jsx && jsx.pragmaFrag || undefined,
        mainFields: ['module', 'jsnext', 'jsnext:main', 'main'],
        loader: loaders,
        watch: watch && {
            onRebuild(error, result) {
                if (error) {
                    // eslint-disable-next-line
                    console.error(error);
                }

                if (metafile && result) {
                    let metaDir = typeof metafile === 'string' ? metafile : outputDir;
                    saveManifestJson(result, metaDir, publicPath);
                    saveEndpointsJson(entryOptions.entryPoints, result, root, metaDir, publicPath, { format });
                }
            },
        },
        plugins: [
            (await import('./build/html.js')).htmlPlugin(),
            (await import('./build/postcss.js')).postcssPlugin(),
            (await import('./build/url.js')).urlPlugin(loaders),
        ],
    });

    if (metafile) {
        let metaDir = typeof metafile === 'string' ? metafile : outputDir;
        await saveManifestJson(result, metaDir, publicPath);
        await saveEndpointsJson(entryOptions.entryPoints, result, root, metaDir, publicPath, { format });
    }

    return result;
}

/**
 * @typedef {import('@web/dev-server').DevServerConfig & { metafile?: boolean|string, entryPoints?: string[] }} DevServerConfig
 */

/**
 * Start the dev server.
 * @param {DevServerConfig} config
 * @return {Promise<import('@web/dev-server-core').DevServer>} The dev server instance.
 */
export async function serve(config) {
    const { startDevServer } = await import('@web/dev-server');
    const { hmrPlugin } = await import('@web/dev-server-hmr');
    const { esbuildPlugin } = await import('@web/dev-server-esbuild');
    const { fromRollup } = await import('@web/dev-server-rollup');
    const { default: rollupCommonjs } = await import('@rollup/plugin-commonjs');
    const { default: cors } = await import('@koa/cors');
    const { cssPlugin } = await import('./server/css.js');
    const { defineEnvVariables } = await import('./helpers/define.js');
    const commonjsPlugin = fromRollup(rollupCommonjs);

    let root = config.rootDir || process.cwd();
    let index = false;
    try {
        index = (await stat(path.join(root, 'index.html'))).isFile();
    } catch {
        //
    }

    let server = await startDevServer({
        readCliArgs: false,
        readFileConfig: false,
        autoExitProcess: true,
        logStartMessage: true,
        config: {
            port: 8080,
            appIndex: index ? 'index.html' : undefined,
            nodeResolve: {
                exportConditions: ['default', 'module', 'import'],
                mainFields: ['module', 'jsnext', 'jsnext:main', 'main'],
            },
            preserveSymlinks: true,
            watch: true,
            clearTerminalOnReload: true,
            open: false,
            ...config,
            rootDir: root,
            middleware: [
                cors(),
            ],
            plugins: [
                cssPlugin(),
                esbuildPlugin({
                    loaders: {
                        '.mjs': 'tsx',
                        '.js': 'tsx',
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
                hmrPlugin(),
                ...(config.plugins || []),
            ],
        },
    });

    if (config.metafile) {
        let metaDir;
        if (typeof config.metafile === 'string') {
            await emptyDir(config.metafile);
            metaDir = config.metafile;
        } else {
            metaDir = config.rootDir || process.cwd();
        }

        await saveDevEndpointsJson(config.entryPoints || [], metaDir, server, {
            format: 'esm',
        });
    }

    return server;
}

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
    const { cssPlugin } = await import('./server/css.js');
    const { defineEnvVariables } = await import('./helpers/define.js');
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
