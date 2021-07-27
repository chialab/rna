import path from 'path';
import { promises } from 'fs';
import { readConfigFile, locateConfigFile } from '@chialab/rna-config-loader';
import { createLogger } from './createLogger.js';

const { stat } = promises;

export { createLogger };

/**
 * @typedef {Partial<import('@web/dev-server-core').DevServerCoreConfig> & { entrypoints?: import('@chialab/rna-config-loader').Entrypoint[], entrypointsPath?: string }} DevServerConfig
 */

export async function buildMiddlewares() {
    const [
        { default: cors },
        { default: range },
    ] = await Promise.all([
        import('@koa/cors'),
        import('koa-range'),
    ]);

    return [
        cors(),
        range,
    ];
}

export async function buildPlugins() {
    const [
        { default: rnaPlugin },
    ] = await Promise.all([
        import('@chialab/wds-plugin-rna'),
    ]);

    return [
        rnaPlugin(),
    ];
}

export async function buildDevPlugins() {
    const [
        { hmrPlugin },
        { hmrCssPlugin },
        { watchPlugin },
    ] = await Promise.all([
        import('./plugins/hmr.js'),
        import('@chialab/wds-plugin-hmr-css'),
        import('./plugins/watch.js'),
    ]);

    return [
        hmrPlugin(),
        watchPlugin(),
        hmrCssPlugin(),
    ];
}

/**
 * Start the dev server.
 * @param {DevServerConfig} config
 * @return {Promise<import('@web/dev-server-core').DevServer>} The dev server instance.
 */
export async function startDevServer(config) {
    const { DevServer } = await import('@web/dev-server-core');

    const root = config.rootDir ? path.resolve(config.rootDir) : process.cwd();
    const appIndex = path.join(root, 'index.html');
    let index = false;
    try {
        index = (await stat(appIndex)).isFile();
    } catch {
        //
    }
    const server = new DevServer({
        appIndex: index ? appIndex : undefined,
        ...config,
        injectWebSocket: true,
        hostname: config.hostname || 'localhost',
        port: config.port || 8080,
        rootDir: root,
        middleware: [
            ...(await buildMiddlewares()),
            ...(config.middleware || []),
        ],
        plugins: [
            ...(await buildPlugins()),
            ...(await buildDevPlugins()),
            ...(config.plugins || []),
        ],
    }, createLogger());

    return server;
}

/**
 * Start the dev server.
 * @param {DevServerConfig} config
 * @return {Promise<import('@web/dev-server-core').DevServer>} The dev server instance.
 */
export async function serve(config) {
    const root = config.rootDir || process.cwd();
    const server = await startDevServer({
        ...config,
        rootDir: root,
    });

    if (config.entrypoints) {
        const { saveDevEntrypointsJson } = await import('@chialab/rna-bundler');
        const dir = config.entrypointsPath ? config.entrypointsPath : root;
        const files = config.entrypoints
            .reduce((acc, { input }) => {
                if (Array.isArray(input)) {
                    acc.push(...input);
                } else {
                    acc.push(input);
                }

                return acc;
            }, /** @type {string[]} */ ([]));
        await saveDevEntrypointsJson(files, dir, server, 'esm');
    }

    await server.start();

    process.on('uncaughtException', error => {
        // eslint-disable-next-line no-console
        console.error(error);
    });

    process.on('SIGINT', async () => {
        await server.stop();
        process.exit(0);
    });

    return server;
}

/**
 * @param {import('commander').Command} program
 */
export function command(program) {
    program
        .command('serve [root]')
        .description('Start a web dev server (https://modern-web.dev/docs/dev-server/overview/) that transforms ESM imports for node resolution on demand. It also uses esbuild (https://esbuild.github.io/) to compile non standard JavaScript syntax.')
        .option('-P, --port <number>', 'server port number')
        .option('-C, --config <path>', 'the rna config file')
        .action(
            /**
             * @param {string} root
             * @param {{ port?: string, config?: string }} options
             */
            async (root = process.cwd(), { port, config: configFile }) => {
                configFile = configFile || await locateConfigFile();

                /**
                 * @type {import('@chialab/rna-config-loader').Config}
                 */
                const config = configFile ? await readConfigFile(configFile, {}) : {
                    root,
                };

                /**
                 * @type {import('@web/dev-server-core').Plugin[]}
                 */
                const plugins = [];

                /**
                 * @type {DevServerConfig}
                 */
                const serveConfig = {
                    rootDir: config.root,
                    port: port ? parseInt(port) : undefined,
                    entrypointsPath: config.entrypointsPath,
                    entrypoints: config.entrypoints,
                };
                try {
                    const { legacyPlugin } = await import('@chialab/wds-plugin-legacy');
                    plugins.push(legacyPlugin({
                        minify: true,
                    }));
                } catch (err) {
                    //
                }

                const server = await serve(serveConfig);

                // eslint-disable-next-line no-console
                console.log(`rna dev server started...

  Root dir: ${serveConfig.rootDir}
  Local:    http://${server.config.hostname}:${server.config.port}/
`);
            }
        );
}
