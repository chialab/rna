import path from 'path';
import { promises } from 'fs';

const { stat } = promises;

/**
 * @typedef {import('@web/dev-server').DevServerConfig & { entries?: string[], entrypoints?: boolean|string }} DevServerConfig
 */

/**
 * Start the dev server.
 * @param {DevServerConfig} config
 * @return {Promise<import('@web/dev-server-core').DevServer>} The dev server instance.
 */
export async function serve(config) {
    const { startDevServer } = await import('@web/dev-server');
    const { hmrPlugin } = await import('@web/dev-server-hmr');
    const { hmrCssPlugin } = await import('@chialab/wds-plugin-hmr-css');
    const { esbuildPlugin } = await import('@web/dev-server-esbuild');
    const { commonjsPlugin } = await import('@chialab/wds-plugin-commonjs');
    const { cssPlugin } = await import('@chialab/wds-plugin-postcss');
    const { defineEnvVariables } = await import('@chialab/esbuild-plugin-env');
    const { default: cors } = await import('@koa/cors');
    const { default: range } = await import('koa-range');

    let root = config.rootDir || process.cwd();
    let appIndex = path.join(root, 'index.html');
    let index = false;
    try {
        index = (await stat(appIndex)).isFile();
    } catch {
        //
    }

    const server = await startDevServer({
        readCliArgs: false,
        readFileConfig: false,
        autoExitProcess: true,
        logStartMessage: true,
        config: {
            port: 8080,
            appIndex: index ? appIndex : undefined,
            nodeResolve: {
                exportConditions: ['default', 'module', 'import', 'browser'],
                mainFields: ['module', 'esnext', 'jsnext', 'jsnext:main', 'main'],
            },
            preserveSymlinks: true,
            watch: true,
            clearTerminalOnReload: true,
            open: false,
            ...config,
            rootDir: root,
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
                        '.js': 'tsx',
                        '.jsx': 'tsx',
                        '.ts': 'ts',
                        '.tsx': 'tsx',
                        '.json': 'json',
                        '.geojson': 'json',
                    },
                    define: {
                        ...defineEnvVariables(),
                    },
                    target: 'auto-always',
                }),
                commonjsPlugin(),
                hmrPlugin(),
                hmrCssPlugin(),
                ...(config.plugins || []),
            ],
        },
    });

    if (config.entrypoints) {
        const { saveDevEntrypointsJson } = await import('@chialab/rna-bundler');
        const dir = typeof config.entrypoints === 'string' ? config.entrypoints : (config.rootDir || process.cwd());
        await saveDevEntrypointsJson(config.entries || [], dir, server, {
            format: 'esm',
        });
    }

    return server;
}

/**
 * @param {import('commander').Command} program
 */
export function command(program) {
    program
        .command('serve [root...]')
        .description('Start a web dev server (https://modern-web.dev/docs/dev-server/overview/) that transforms ESM imports for node resolution on demand. It also uses esbuild (https://esbuild.github.io/) to compile non standard JavaScript syntax.')
        .option('-P, --port <number>', 'server port number')
        .option('--entrypoints [path]', 'generate and serve entrypoints')
        .action(
            /**
             * @param {string[]} entries
             * @param {{ port?: string, entrypoints?: boolean|string }} options
             */
            async (entries, { port, entrypoints }) => {
                /**
                 * @type {import('@web/dev-server-core').Plugin[]}
                 */
                const plugins = [];

                /**
                 * @type {DevServerConfig}
                 */
                const config = {
                    rootDir: entrypoints ? process.cwd() : (entries[0] || process.cwd()),
                    port: port ? parseInt(port) : undefined,
                    entries,
                    entrypoints,
                };
                try {
                    const { legacyPlugin } = await import('@chialab/wds-plugin-legacy');
                    plugins.push(legacyPlugin({
                        minify: true,
                    }));
                } catch (err) {
                    //
                }

                await serve(config);
            }
        );
}
