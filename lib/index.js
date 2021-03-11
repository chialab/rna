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
    '.ts': 'tsx',
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
    sourcemap = true,
    minify = false,
    watch = false,
} = {}) {
    const esbuild = require('esbuild');
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

    return await esbuild.build({
        ...entryOptions,
        globalName: name,
        outfile: hasOutputFile ? output : undefined,
        outdir: hasOutputFile ? undefined : output,
        bundle: true,
        splitting: format === 'esm' && !hasOutputFile,
        target,
        sourcemap,
        minify,
        platform,
        format,
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

async function serve(config = {}, options = {}) {
    const devServer = require('@web/dev-server');
    const rootDir = config.rootDir || process.cwd();

    // const esbuildServer = await esbuild.serve({
    //     servedir: 'www',
    // }, {
    //     entryPoints: [
    //         'src/styles/style.css',
    //         'src/index.js',
    //     ],
    //     outdir: 'www',
    //     outbase: config.rootDir || process.cwd(),
    //     bundle: true,
    //     splitting: true,
    //     minify: false,
    //     platform: 'browser',
    //     format: 'esm',
    //     mainFields: ['module', 'jsnext', 'jsnext:main', 'main'],
    //     loader: loaders,
    //     assetNames: '[name]',
    //     plugins: [
    //         require('./plugins/postcss')(),
    //         require('./plugins/url')(loaders),
    //     ],
    //     ...(config.build || {}),
    // });

    // const proxy = require('koa-proxies')('/', {
    //     target: `http://${esbuildServer.host}:${esbuildServer.port}`,
    // });

    return devServer.startDevServer({
        readCliArgs: false,
        readFileConfig: false,
        autoExitProcess: true,
        logStartMessage: true,
        ...options,
        config: {
            port: 3000,
            appIndex: 'index.html',
            nodeResolve: true,
            preserveSymlinks: true,
            watch: true,
            clearTerminalOnReload: true,
            open: false,
            ...config,
            rootDir,
            plugins: [
                require('./plugins/css')({
                    root: rootDir,
                }),
                require('@web/dev-server-esbuild').esbuildPlugin({
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
            // middleware: [
            //     async (ctx, next) => {
            //         if (!(path.extname(ctx.path) in loaders)) {
            //             return next();
            //         }
            //         if (ctx.path.match(/web-dev-server/)) {
            //             return next();
            //         }

            //         return proxy(ctx, next);
            //     },
            //     ...(config.middleware || []),
            // ],
        },
    });
}

module.exports = {
    build,
    serve,
};
