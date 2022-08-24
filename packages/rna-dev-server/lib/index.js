import { stat } from 'fs/promises';
import path from 'path';
import { readConfigFile, mergeConfig, locateConfigFile } from '@chialab/rna-config-loader';
import { createLogger, colors } from '@chialab/rna-logger';
import { DevServer, getPort, portNumbers } from '@chialab/es-dev-server';
import cors from '@koa/cors';
import range from 'koa-range';
import nodeResolvePlugin from '@chialab/wds-plugin-node-resolve';
import { rnaPlugin, entrypointsPlugin } from '@chialab/wds-plugin-rna';

/**
 * @typedef {Object} DevServerCoreConfig
 * @property {import('@chialab/rna-logger').Logger} [logger]
 * @property {import('@chialab/rna-config-loader').EntrypointConfig[]} [entrypoints]
 * @property {string} [manifestPath]
 * @property {string} [entrypointsPath]
 * @property {import('@chialab/rna-config-loader').AliasMap} [alias]
 * @property {import('esbuild').Plugin[]} [transformPlugins]
 * @property {string | string[]} [target]
 * @property {'transform'|'preserve'|'automatic'} [jsx]
 * @property {string} [jsxImportSource]
 * @property {string} [jsxFactory]
 * @property {string} [jsxFragment]
 */

/**
 * @typedef {Partial<import('@chialab/es-dev-server').DevServerCoreConfig> & DevServerCoreConfig} DevServerConfig
 */

/**
 * Load configuration for the dev server.
 * @param {Partial<DevServerConfig>} [initialConfig]
 * @param {string} [configFile]
 * @returns {Promise<DevServerConfig>}
 */
export async function loadDevServerConfig(initialConfig = {}, configFile = undefined) {
    configFile = configFile || await locateConfigFile();

    const rootDir = initialConfig.rootDir || process.cwd();
    const logger = createLogger();

    /**
     * @type {import('@chialab/rna-config-loader').ProjectConfig}
     */
    const config = mergeConfig(
        { root: rootDir },
        configFile ? await readConfigFile(configFile, { root: rootDir }, 'serve') : {}
    );

    const servePlugins = config.servePlugins || [];
    const transformPlugins = [...(config.plugins || [])];
    const finalPlugins = [...(initialConfig.plugins || [])];

    finalPlugins.push(...servePlugins);

    try {
        if (!finalPlugins.some((p) => p.name === 'legacy')) {
            const { legacyPlugin } = await import('@chialab/wds-plugin-legacy');
            finalPlugins.push(legacyPlugin({
                minify: true,
            }));
        }
    } catch (err) {
        //
    }

    return {
        logger,
        transformPlugins,
        ...initialConfig,
        plugins: finalPlugins,
        rootDir: initialConfig.rootDir ?? config.root,
        entrypointsPath: initialConfig.entrypointsPath ?? config.entrypointsPath,
        entrypoints: initialConfig.entrypoints ?? config.entrypoints,
        alias: initialConfig.alias ?? config.alias,
        target: initialConfig.target ?? config.target,
        jsx: initialConfig.jsx ?? config.jsx,
        jsxImportSource: initialConfig.jsxImportSource ?? config.jsxImportSource,
        jsxFactory: initialConfig.jsxFactory ?? config.jsxFactory,
        jsxFragment: initialConfig.jsxFragment ?? config.jsxFragment,
    };
}

/**
 * Create a dev server.
 * @param {DevServerConfig} config
 * @returns {Promise<import('@chialab/es-dev-server').DevServer>} The dev server instance.
 */
export async function createDevServer(config) {
    const root = config.rootDir ? path.resolve(config.rootDir) : process.cwd();
    const appIndex = path.join(root, 'index.html');
    let index = false;
    try {
        index = (await stat(appIndex)).isFile();
    } catch {
        //
    }

    const plugins = [
        rnaPlugin({
            alias: config.alias,
            target: config.target,
            jsx: config.jsx,
            jsxImportSource: config.jsxImportSource,
            jsxFactory: config.jsxFactory,
            jsxFragment: config.jsxFragment,
            plugins: config.transformPlugins,
        }),
        entrypointsPlugin(config.entrypoints),
        ...(config.plugins || []),
        nodeResolvePlugin({
            alias: config.alias,
        }),
    ];
    if (!plugins.find((plugin) => plugin.name === 'hmr' || plugin.name === 'wc-hmr')) {
        const { hmrPlugin } = await import('@chialab/wds-plugin-hmr');
        plugins.push(hmrPlugin());
    }

    const server = new DevServer({
        appIndex: index ? appIndex : undefined,
        ...config,
        injectWebSocket: true,
        hostname: config.hostname || 'localhost',
        port: config.port || await getPort({
            port: [
                ...portNumbers(8080, 8090),
                ...portNumbers(3000, 3100),
            ],
        }),
        rootDir: root,
        middleware: [
            cors({ origin: '*' }),
            range,
            ...(config.middleware || []),
        ],
        plugins,
    }, config.logger || createLogger());

    return server;
}

/**
 * Start the dev server.
 * @param {DevServerConfig} config
 * @returns {Promise<import('@chialab/es-dev-server').DevServer>} The dev server instance.
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
 * @typedef {Object} ServeCommandOptions
 * @property {number} [port]
 * @property {string} [config]
 * @property {boolean|string} [manifest]
 * @property {boolean|string} [entrypoints]
 * @property {string} [target]
 * @property {'transform'|'preserve'|'automatic'} [jsx]
 * @property {string} [jsxImportSource]
 * @property {string} [jsxFactory]
 * @property {string} [jsxFragment]
 */

/**
 * @param {import('commander').Command} program
 */
export function command(program) {
    program
        .command('serve [root]')
        .description('Start a web dev server (https://modern-web.dev/docs/dev-server/overview/) that transforms ESM imports for node resolution on demand. It also uses esbuild (https://esbuild.github.io/) to compile non standard JavaScript syntax.')
        .option('-P, --port <number>', 'server port number', parseInt)
        .option('-C, --config <path>', 'the rna config file')
        .option('--manifest <path>', 'generate manifest file')
        .option('--entrypoints <path>', 'generate entrypoints file')
        .option('--target <query>', 'output targets (es5, es2015, es2020)')
        .option('--jsx <mode>', 'jsx transform mode')
        .option('--jsxFactory <identifier>', 'jsx pragma')
        .option('--jsxFragment <identifier>', 'jsx fragment')
        .option('--jsxImportSource <name>', 'jsx module name')
        .action(
            /**
             * @param {string} root
             * @param {ServeCommandOptions} options
             */
            async (root = process.cwd(), options) => {
                const {
                    port,
                    target,
                    jsx,
                    jsxImportSource,
                    jsxFactory,
                    jsxFragment,
                } = options;

                const manifestPath = options.manifest ? (typeof options.manifest === 'string' ? options.manifest : path.join(root, 'manifest.json')) : undefined;
                const entrypointsPath = options.entrypoints ? (typeof options.entrypoints === 'string' ? options.entrypoints : path.join(root, 'entrypoints.json')) : undefined;
                const serveConfig = await loadDevServerConfig({
                    rootDir: root,
                    port,
                    manifestPath,
                    entrypointsPath,
                    target,
                    jsx,
                    jsxImportSource,
                    jsxFactory,
                    jsxFragment,
                }, options.config);

                const server = await serve(serveConfig);

                serveConfig.logger?.log(`
  ${colors.bold('rna dev server started')}

  root:     ${colors.blue.bold(path.resolve(serveConfig.rootDir || root))}
  local:    ${colors.blue.bold(`http://${server.config.hostname}:${server.config.port}/`)}
`);
            }
        );
}
