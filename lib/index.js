import path from 'path';
import { promises } from 'fs';

const { readFile, writeFile } = promises;

/**
 * Convert a file path to CamelCase.
 *
 * @param {string} file The file path.
 * @return {string}
 */
function camelize(file) {
    let filename = path.basename(file, path.extname(file));
    return filename.replace(/(^[a-z0-9]|[-_]([a-z0-9]))/g, (g) => (g[1] || g[0]).toUpperCase());
}

/**
 * Write build manifest.json
 * @param {import('esbuild').BuildResult} result The build result.
 * @param {string[]} entrypoints The build entrypoints.
 * @param {string} outputDir The output dir.
 * @param {string} publicDir The public dir.
 */
async function saveManifestJson(result, entrypoints, outputDir, publicDir = outputDir) {
    let { metafile } = result;
    if (!metafile) {
        return;
    }

    let { outputs } = metafile;

    /**
     * @type {{[file: string]: string}}
     */
    let manifestJson = {};
    for (let k in outputs) {
        let entry = outputs[k].entryPoint || Object.keys(outputs[k].inputs)[0] || undefined;
        if (entry) {
            manifestJson[path.join(path.dirname(k), path.basename(entry))] = `/${path.relative(publicDir, k)}`;
        } else if (k.match(/\.map$/)) {
            entry = outputs[k.replace(/\.map$/, '')].entryPoint;
            if (entry) {
                manifestJson[path.join(path.dirname(k), `${path.basename(entry)}.map`)] = `/${path.relative(publicDir, k)}`;
            }
        }
    }
    await writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifestJson, null, 2));

    /**
     * @type {{[file: string]: { js?: string[], style?: string[] }}}
     */
    let entrypointsJson = {};
    entrypoints.forEach((entrypoint) => {
        let fullName = path.basename(entrypoint);
        let extname = path.extname(entrypoint);
        let basename = path.basename(entrypoint, extname);
        let loader = loaders[extname] || 'tsx';
        entrypointsJson[basename] = entrypointsJson[basename] || {};
        switch (loader) {
            case 'css': {
                let list = entrypointsJson[basename]['style'] = entrypointsJson[basename]['style'] || [];
                list.push(`/${path.relative(publicDir, path.join(outputDir, fullName))}`);
                break;
            }
            default: {
                let list = entrypointsJson[basename]['js'] = entrypointsJson[basename]['js'] || [];
                list.push(`/${path.relative(publicDir, path.join(outputDir, fullName))}`);
                break;
            }
        }
    });
    await writeFile(path.join(outputDir, 'entrypoints.json'), JSON.stringify({ entrypoints: entrypointsJson }, null, 2));
}

/**
 * @type {{[ext: string]: import('esbuild').Loader}}
 */
export const loaders = {
    '.mjs': 'tsx',
    '.js': 'tsx',
    '.jsx': 'tsx',
    '.ts': 'ts',
    '.tsx': 'tsx',
    '.json': 'json',
    '.geojson': 'json',
    '.css': 'css',
};

/**
 * @typedef {Object} JSXOptions
 * @property {string} pragma The jsx pragma to use.
 * @property {string} [pragmaFrag] The jsx pragma to use for fragments.
 */

/**
 * @typedef {Omit<import('esbuild').BuildOptions, 'loader'> & { output: string, root?: string, input?: string|string[], code?: string, loader?: import('esbuild').Loader, name?: string, jsx?: JSXOptions }} BuildOptions
 */

/**
 * @typedef {import('esbuild').BuildResult & { outputFiles?: import('esbuild').OutputFile[] }} BuildResult
 */

/**
 * Build and bundle sources.
 * @param {BuildOptions} options
 * @return {Promise<BuildResult>} The esbuild bundle result.
 */
export async function build(options) {
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
        metafile = false,
        bundle = false,
        sourcemap = true,
        minify = false,
        watch = false,
    } = options;

    let hasOutputFile = !!path.extname(output);
    let outputDir = hasOutputFile ? path.dirname(output) : output;
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
        entryNames: minify ? '[name]-[hash]' : '[name]',
        assetNames: minify ? '[name]-[hash]' : '[name]',
        publicPath,
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
                    saveManifestJson(result, entryOptions.entryPoints, outputDir, publicPath);
                }
            },
        },
        plugins: [
            (await import('./plugins/postcss.js')).postcssPlugin(),
            (await import('./plugins/url.js')).urlPlugin(loaders),
        ],
    });

    if (metafile) {
        await saveManifestJson(result, entryOptions.entryPoints, outputDir, publicPath);
    }

    return result;
}

/**
 * Start the dev server.
 * @param {Partial<import('@web/dev-server').DevServerConfig>} config
 * @return {Promise<import('@web/dev-server-core').DevServer>} The dev server instance.
 */
export async function serve(config = {}) {
    const { startDevServer } = await import('@web/dev-server');
    const { esbuildPlugin } = await import('@web/dev-server-esbuild');
    const { fromRollup } = await import('@web/dev-server-rollup');
    const { default: rollupCommonjs } = await import('@rollup/plugin-commonjs');
    const { cssPlugin } = await import('./server/css.js');
    const { defineEnvVariables } = await import('./helpers/define.js');
    const commonjsPlugin = fromRollup(rollupCommonjs);

    return startDevServer({
        readCliArgs: false,
        readFileConfig: false,
        autoExitProcess: true,
        logStartMessage: true,
        config: {
            port: 8080,
            appIndex: 'index.html',
            nodeResolve: {
                exportConditions: ['default', 'module', 'import'],
                mainFields: ['module', 'jsnext', 'jsnext:main', 'main'],
            },
            preserveSymlinks: true,
            watch: true,
            clearTerminalOnReload: true,
            open: false,
            ...config,
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
                ...(config.plugins || []),
            ],
        },
    });
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
