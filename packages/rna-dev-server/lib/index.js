import { stat } from 'fs/promises';
import path from 'path';
import process from 'process';
import { DevServer, getPort, portNumbers } from '@chialab/es-dev-server';
import { locateConfigFile, mergeConfig, readConfigFile } from '@chialab/rna-config-loader';
import nodeResolvePlugin from '@chialab/wds-plugin-node-resolve';
import { entrypointsPlugin, rnaPlugin } from '@chialab/wds-plugin-rna';
import cors from '@koa/cors';
import range from 'koa-range';

/**
 * @typedef {Object} DevServerCoreConfig
 * @property {import('@chialab/rna-config-loader').EntrypointConfig[]} [entrypoints]
 * @property {string} [manifestPath]
 * @property {string} [entrypointsPath]
 * @property {Record<string, string>} [alias]
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
    configFile = configFile || (await locateConfigFile());

    const rootDir = initialConfig.rootDir || process.cwd();

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
            finalPlugins.push(
                legacyPlugin({
                    minify: true,
                })
            );
        }
    } catch (err) {
        //
    }

    return {
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
 * @param {import('@chialab/rna-logger').Logger} logger
 * @returns {Promise<import('@chialab/es-dev-server').DevServer>} The dev server instance.
 */
export async function createDevServer(config, logger) {
    const root = config.rootDir ? path.resolve(config.rootDir) : process.cwd();
    const appIndex = path.join(root, 'index.html');
    let index = false;
    try {
        index = (await stat(appIndex)).isFile();
    } catch {
        //
    }

    const plugins = [
        ...(config.plugins || []).filter((plugin) => plugin.enforce === 'pre'),
        rnaPlugin({
            alias: config.alias,
            target: config.target,
            jsx: config.jsx,
            jsxImportSource: config.jsxImportSource,
            jsxFactory: config.jsxFactory,
            jsxFragment: config.jsxFragment,
            plugins: config.transformPlugins,
        }),
        entrypointsPlugin({
            entrypoints: config.entrypoints || [],
        }),
        nodeResolvePlugin({
            alias: config.alias,
        }),
        ...(config.plugins || []).filter((plugin) => !plugin.enforce),
        ...(config.plugins || []).filter((plugin) => plugin.enforce === 'post'),
    ];
    if (!plugins.find((plugin) => plugin.name.match(/(^|-)hmr$/))) {
        const { hmrPlugin, hmrCssPlugin } = await import('@chialab/wds-plugin-hmr');
        plugins.push(hmrPlugin(), hmrCssPlugin());
    }

    const server = new DevServer(
        {
            appIndex: index ? appIndex : undefined,
            ...config,
            injectWebSocket: true,
            hostname: config.hostname || 'localhost',
            port:
                config.port ||
                (await getPort({
                    port: [...portNumbers(8080, 8090), ...portNumbers(3000, 3100)],
                })),
            rootDir: root,
            middleware: [
                /** @type {import('koa').Middleware} */ (/** @type {unknown} */ (cors({ origin: '*' }))),
                /** @type {import('koa').Middleware} */ (/** @type {unknown} */ (range)),
                ...(config.middleware || []),
            ],
            plugins,
        },
        logger
    );

    return server;
}

/**
 * Start the dev server.
 * @param {DevServerConfig} config
 * @param {import('@chialab/rna-logger').Logger} logger
 * @returns {Promise<import('@chialab/es-dev-server').DevServer>} The dev server instance.
 */
export async function serve(config, logger) {
    const root = config.rootDir || process.cwd();
    const server = await createDevServer(
        {
            ...config,
            rootDir: root,
        },
        logger
    );

    await server.start();

    return server;
}
