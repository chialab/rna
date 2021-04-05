import path from 'path';
import { promises } from 'fs';

const { readFile } = promises;

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
 * @typedef {Object} BuildOptionsCustom
 * @property {string} [root] The root directory for the build.
 * @property {string} [input] Build entrypoint.
 * @property {string} [code] Input code to build.
 * @property {import('esbuild').Loader} [loader] The loader to use for code input.
 * @property {string} output Output file or directory for the build.
 * @property {string} [name] The IIFE identifier for the build.
 * @property {JSXOptions} [jsx] JSX transpile options.
 */

/**
 * @typedef {import('esbuild').BuildOptions & BuildOptionsCustom} BuildOptions
 */

/**
 * @typedef {import('esbuild').BuildResult & { outputFiles?: import('esbuild').OutputFile[] }} BuildResult
 */

/**
 * Build and bundle sources.
 * @param {BuildOptions} options
 * @return {Promise<BuildResult>}
 */
export async function build(options) {
    const { default: esbuild } = await import('esbuild');
    const { default: pkgUp } = await import('pkg-up');
    const { default: browserslist } = await import('browserslist');

    let {
        root = process.cwd(),
        input,
        code,
        output,
        loader = 'tsx',
        format = 'esm',
        platform = format === 'cjs' ? 'node' : 'browser',
        name = camelize(output),
        jsx,
        target,
        bundle = false,
        sourcemap = true,
        minify = false,
        watch = false,
    } = options;

    let hasOutputFile = !!path.extname(output);
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
            sourcefile: input,
        };
    } else if (input) {
        entryOptions.entryPoints = [input];
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

    /**
     * @type {{ [key: string]: string }}
     */
    let definitions = {};
    definitions['process.env.NODE_ENV'] = JSON.stringify(process.env.NODE_ENV || 'development');
    Object.keys(process.env).forEach((map, key) => {
        if (isNaN(key)) {
            definitions[`process.env.${key}`] = JSON.stringify(process.env[key]);
        }
    });
    definitions['process.env'] = '{}';

    return await esbuild.build({
        ...entryOptions,
        globalName: name,
        define: definitions,
        outfile: hasOutputFile ? output : undefined,
        outdir: hasOutputFile ? undefined : output,
        splitting: format === 'esm' && !hasOutputFile,
        target,
        bundle: true,
        sourcemap,
        minify,
        platform,
        format,
        external,
        metafile: true,
        jsxFactory: jsx && jsx.pragma || undefined,
        jsxFragment: jsx && jsx.pragmaFrag || undefined,
        mainFields: ['module', 'jsnext', 'jsnext:main', 'main'],
        loader: loaders,
        watch,
        plugins: [
            (await import('./plugins/postcss.js')).postcssPlugin(),
            (await import('./plugins/url.js')).urlPlugin(loaders),
        ],
    });
}

/**
 * Start the dev server.
 * @param {Partial<import('@web/dev-server').DevServerConfig>} config
 * @return The dev server instance.
 */
export async function serve(config = {}) {
    const { startDevServer } = await import('@web/dev-server');
    const { esbuildPlugin } = await import('@web/dev-server-esbuild');
    const { fromRollup } = await import('@web/dev-server-rollup');
    const { default: rollupCommonjs } = await import('@rollup/plugin-commonjs');
    const { cssPlugin } = await import('./server/css.js');

    let root = path.resolve(process.cwd(), config.rootDir || '.');

    /**
     * @type {{ [key: string]: string }}
     */
    let definitions = {};
    definitions['process.env.NODE_ENV'] = JSON.stringify(process.env.NODE_ENV || 'development');
    Object.keys(process.env).forEach((map, key) => {
        if (isNaN(key)) {
            definitions[`process.env.${key}`] = JSON.stringify(process.env[key]);
        }
    });
    definitions['process.env'] = '{}';

    return startDevServer({
        readCliArgs: false,
        readFileConfig: false,
        autoExitProcess: true,
        logStartMessage: true,
        config: {
            port: 3000,
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
            rootDir: root,
            plugins: [
                cssPlugin({
                    root,
                }),
                fromRollup(rollupCommonjs)({
                    ignoreTryCatch: true,
                    exclude: [
                        'node_modules/chai/chai.js',
                        'node_modules/chai-dom/chai-dom.js',
                    ],
                }),
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
                    define: definitions,
                }),
                ...(config.plugins || []),
            ],
        },
    });
}

/**
 * Start the test runner.
 * @param {Partial<import('@web/test-runner').TestRunnerConfig>} config
 * @return The test runner instance.
 */
export async function test(config) {
    const { startTestRunner } = await import('@web/test-runner');
    const { esbuildPlugin } = await import('@web/dev-server-esbuild');
    const { fromRollup } = await import('@web/dev-server-rollup');
    const { default: rollupCommonjs } = await import('@rollup/plugin-commonjs');
    const { cssPlugin } = await import('./server/css');

    let root = config.rootDir || process.cwd();
    /**
     * @type {{ [key: string]: string }}
     */
    let definitions = {};
    definitions['process.env.NODE_ENV'] = JSON.stringify(process.env.NODE_ENV || 'development');
    Object.keys(process.env).forEach((map, key) => {
        if (isNaN(key)) {
            definitions[`process.env.${key}`] = JSON.stringify(process.env[key]);
        }
    });
    definitions['process.env'] = '{}';

    return await startTestRunner({
        readCliArgs: false,
        readFileConfig: false,
        autoExitProcess: true,
        config: {
            files: [
                'test/**/*.test.js',
                'test/**/*.spec.js',
            ],
            testFramework: {
                path: '',
                config: {
                    ui: 'bdd',
                    timeout: '10000',
                },
            },
            nodeResolve: {
                exportConditions: ['default', 'module', 'import', 'require'],
                mainFields: ['umd:main', 'module', 'browser', 'jsnext', 'jsnext:main', 'main'],
            },
            preserveSymlinks: true,
            open: false,
            ...config,
            port: config.port,
            watch: config.watch,
            rootDir: root,
            testRunnerHtml: testFramework => `<html>
                <body>
                    <script type="module">
                        document.addEventListener('DOMContentLoaded', () => import('${testFramework}'));
                    </script>
                </body>
            </html>`,
            plugins: [
                cssPlugin({
                    root,
                }),
                fromRollup(rollupCommonjs)({
                    ignoreTryCatch: true,
                    exclude: [
                        'node_modules/chai/chai.js',
                        'node_modules/chai-dom/chai-dom.js',
                    ],
                }),
                esbuildPlugin({
                    loaders: {
                        '.mjs': 'tsx',
                        '.jsx': 'tsx',
                        '.ts': 'tsx',
                        '.tsx': 'tsx',
                        '.json': 'json',
                        '.geojson': 'json',
                    },
                    define: definitions,
                }),
                ...(config.plugins || []),
            ],
        },
    });
}
