const path = require('path');

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

const loaders = {
    '.mjs': 'tsx',
    '.js': 'tsx',
    '.jsx': 'tsx',
    '.ts': 'ts',
    '.tsx': 'tsx',
    '.json': 'json',
    '.geojson': 'json',
    '.css': 'css',
};

async function build({
    input,
    output,
    code,
    loader = 'tsx',
    root = process.cwd(),
    format = 'esm',
    platform = format === 'cjs' ? 'node' : 'browser',
    name = camelize(output || input),
    jsx,
    targets,
    bundle = false,
    sourcemap = true,
    minify = false,
    watch = false,
} = {}) {
    const esbuild = require('esbuild');
    const pkgUp = require('pkg-up');
    const browserslist = require('browserslist');

    let hasOutputFile = !!path.extname(output);
    let target = targets ?
        browserslist(targets)
            .filter((entry) => ['chrome', 'firefox', 'safari', 'edge', 'node'].includes(entry.split(' ')[0]))
            .map((entry) => entry.split(' ').join('')) :
        ['es2020'];

    let entryOptions = {};
    if (code) {
        entryOptions.stdin = {
            contents: code,
            loader,
            resolveDir: root,
            sourcefile: input,
        };
    } else if (input) {
        entryOptions.entryPoints = [input];
    }

    let external = [];
    if (!bundle) {
        let packageFile = await pkgUp({
            cwd: root,
        });
        let packageJson = require(packageFile);
        external = [
            ...external,
            ...Object.keys(packageJson.dependencies || {}),
            ...Object.keys(packageJson.peerDependencies || {}),
        ];
    }

    return await esbuild.build({
        ...entryOptions,
        globalName: name,
        define: {
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
            ...Object.keys(process.env).reduce((map, key) => {
                map[`process.env.${key}`] = JSON.stringify(process.env[key]);
                return map;
            }, {}),
        },
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
            require('./plugins/postcss')(),
            require('./plugins/url')(loaders),
        ],
    });
}

async function serve(config = {}) {
    const devServer = require('@web/dev-server');
    const { esbuildPlugin } = require('@web/dev-server-esbuild');
    const { fromRollup } = require('@web/dev-server-rollup');
    const rollupCommonjs = require('@rollup/plugin-commonjs');
    const css = require('./server/css');

    let root = config.root || process.cwd();

    return devServer.startDevServer({
        readCliArgs: false,
        readFileConfig: false,
        autoExitProcess: true,
        logStartMessage: true,
        config: {
            port: 3000,
            appIndex: 'index.html',
            nodeResolve: {
                exportConditions: ['default', 'module', 'import', 'require'],
                mainFields: ['module', 'jsnext', 'jsnext:main', 'main'],
            },
            preserveSymlinks: true,
            watch: true,
            clearTerminalOnReload: true,
            open: false,
            ...config,
            rootDir: root,
            plugins: [
                css({
                    root,
                }),
                fromRollup(rollupCommonjs)({
                    ignoreTryCatch: true,
                    exclude: [
                        'node_modules/chai/chai.js',
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
                }),
                ...(config.plugins || []),
            ],
        },
    });
}

async function test(config) {
    const { startTestRunner } = require('@web/test-runner');
    const { esbuildPlugin } = require('@web/dev-server-esbuild');
    const { fromRollup } = require('@web/dev-server-rollup');
    const rollupCommonjs = require('@rollup/plugin-commonjs');
    const css = require('./server/css');

    let root = config.root || process.cwd();

    await startTestRunner({
        readCliArgs: false,
        readFileConfig: false,
        autoExitProcess: true,
        logStartMessage: true,
        config: {
            files: [
                'test/**/*.test.js',
                'test/**/*.spec.js',
            ],
            testFramework: {
                config: {
                    ui: 'bdd',
                    timeout: '10000',
                },
            },
            port: 9876,
            nodeResolve: {
                exportConditions: ['default', 'module', 'import', 'require'],
                mainFields: ['umd:main', 'module', 'browser', 'jsnext', 'jsnext:main', 'main'],
            },
            preserveSymlinks: true,
            watch: false,
            open: false,
            ...config,
            rootDir: root,
            testRunnerHtml: testFramework => `<html>
                <body>
                    <script type="module">
                        document.addEventListener('DOMContentLoaded', () => import('${testFramework}'));
                    </script>
                </body>
            </html>`,
            plugins: [
                css({
                    root,
                }),
                fromRollup(rollupCommonjs)({
                    ignoreTryCatch: true,
                    exclude: [
                        'node_modules/chai/chai.js',
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
                }),
                ...(config.plugins || []),
            ],
        },
    });
}

module.exports = {
    build,
    serve,
    test,
};
