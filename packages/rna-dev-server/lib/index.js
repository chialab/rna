import { stat } from 'fs/promises';
import path from 'path';
import { readConfigFile, mergeConfig, locateConfigFile } from '@chialab/rna-config-loader';
import { createLogger, colors } from '@chialab/rna-logger';

/**
 * @typedef {Object} DevServerCoreConfig
 * @property {import('@chialab/rna-logger').Logger} [logger]
 * @property {import('@chialab/rna-config-loader').Entrypoint[]} [entrypoints]
 * @property {string} [entrypointsPath]
 * @property {{ [key: string]: string|false }} [alias]
 * @property {import('esbuild').Plugin[]} [transformPlugins]
 */

/**
 * @typedef {Partial<import('@web/dev-server-core').DevServerCoreConfig> & DevServerCoreConfig} DevServerConfig
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

/**
 * @param {DevServerConfig} config
 */
export async function buildPlugins(config) {
    const [
        { default: rnaPlugin, entrypointsPlugin },
    ] = await Promise.all([
        import('@chialab/wds-plugin-rna'),
    ]);

    return [
        rnaPlugin({
            alias: config.alias,
            transformPlugins: config.transformPlugins,
        }),
        entrypointsPlugin(config.entrypoints, config.entrypointsPath),
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
export async function createDevServer(config) {
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
            ...(config.plugins || []),
            ...(await buildPlugins(config)),
            ...(await buildDevPlugins()),
        ],
    }, config.logger || createLogger());

    return server;
}

/**
 * Start the dev server.
 * @param {DevServerConfig} config
 * @return {Promise<import('@web/dev-server-core').DevServer>} The dev server instance.
 */
export async function serve(config) {
    const root = config.rootDir || process.cwd();
    const server = await createDevServer({
        ...config,
        rootDir: root,
    });

    await server.start();

    process.on('uncaughtException', error => {
        config.logger?.error(error);
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

                const logger = createLogger();

                /**
                 * @type {import('@chialab/rna-config-loader').Config}
                 */
                const config = mergeConfig({ root }, configFile ? await readConfigFile(configFile, { root }, 'serve') : {});

                /**
                 * @type {import('@web/dev-server-core').Plugin[]}
                 */
                const plugins = config.servePlugins || [];

                /**
                 * @type {DevServerConfig}
                 */
                const serveConfig = {
                    rootDir: config.root,
                    port: port ? parseInt(port) : undefined,
                    entrypointsPath: config.entrypointsPath,
                    entrypoints: config.entrypoints,
                    alias: config.alias,
                    logger,
                    plugins,
                    transformPlugins: config.transformPlugins,
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

                logger.log(`
  rna dev server started

  Root:     ${colors.blue.bold(path.resolve(serveConfig.rootDir || root))}
  Local:    ${colors.blue.bold(`http://${server.config.hostname}:${server.config.port}/`)}
`);
            }
        );
}
