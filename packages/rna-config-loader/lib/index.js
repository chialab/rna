import { access } from 'fs/promises';
import path from 'path';
import process from 'process';
import { pathToFileURL } from 'url';

/**
 * @typedef {import('esbuild').BuildOptions} BuildOptions
 */

/**
 * @typedef {import('esbuild').Format} Format
 */

/**
 * @typedef {import('esbuild').Loader} Loader
 */

/**
 * @typedef {import('esbuild').Platform} Platform
 */

/**
 * @typedef {import('esbuild').Plugin} Plugin
 */

/**
 * @typedef {import('esbuild').LogLevel} LogLevel
 */

/**
 * @typedef {import('@chialab/es-dev-server').Plugin} ServePlugin
 */

/**
 * @typedef {boolean|'external'|'inline'|'both'} SourcemapType
 */

/**
 * @typedef {{ [key: string]: string }} DefineMap
 */

/**
 * @typedef {'build'|'serve'} Mode
 */

/**
 * @typedef {Object} RnaConfig
 * @property {string} [root]
 * @property {string} [publicPath]
 * @property {string} [manifestPath]
 * @property {string} [entrypointsPath]
 * @property {boolean} [clean]
 * @property {boolean} [watch]
 */

/**
 * @typedef {Object} RnaEntrypointConfig
 * @property {string|string[]} input
 * @property {string} [output]
 * @property {string} [name]
 * @property {string} [code]
 */

/**
 * @typedef {BuildOptions & RnaConfig & RnaEntrypointConfig} EntrypointConfig
 */

/**
 * @typedef {Object} RnaProjectConfig
 * @property {EntrypointConfig[]} [entrypoints]
 * @property {ServePlugin[]} [servePlugins]
 */

/**
 * @typedef {BuildOptions & RnaConfig & RnaProjectConfig} ProjectConfig
 */

/**
 * Convert a file path to CamelCase.
 *
 * @param {string} file The file path.
 * @returns {string}
 */
export function camelize(file) {
    const filename = path.basename(file, path.extname(file));
    return filename.replace(/(^[a-z0-9]|[-_]([a-z0-9]))/g, (g) => (g[1] || g[0]).toUpperCase()).replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * @param {EntrypointConfig} entrypoint
 * @param {ProjectConfig} config
 * @returns {ProjectConfig & { input: string|string[] }}
 */
export function getEntryConfig(entrypoint, config) {
    const root = entrypoint.root || config.root || process.cwd();
    const publicPath = entrypoint.publicPath || config.publicPath;
    const format = entrypoint.format || config.format || 'esm';
    const target = entrypoint.target || config.target || (format === 'iife' ? 'es5' : 'es2020');
    const platform = entrypoint.platform || config.platform || (format === 'cjs' ? 'node' : 'browser');

    if (!entrypoint.input) {
        throw new Error('Missing required `input` option');
    }

    return {
        ...config,
        ...entrypoint,
        root,
        publicPath,
        format,
        target,
        platform,
        sourcemap: entrypoint.sourcemap ?? config.sourcemap ?? true,
        bundle: entrypoint.bundle ?? config.bundle ?? false,
        minify: entrypoint.minify ?? config.minify ?? false,
        clean: entrypoint.clean ?? config.clean ?? false,
        splitting: entrypoint.splitting ?? config.splitting,
        globalName: entrypoint.globalName || entrypoint.name || (format === 'iife' ? camelize(Array.isArray(entrypoint.input) ? entrypoint.input[0] : entrypoint.input) : undefined),
        entryNames: entrypoint.entryNames || config.entryNames || '[dir]/[name]',
        chunkNames: entrypoint.chunkNames || config.chunkNames || '[name]-[hash]',
        assetNames: entrypoint.assetNames || config.assetNames || '[name]-[hash]',
        define: {
            ...(entrypoint.define || {}),
            ...(config.define || {}),
        },
        external: [
            ...(entrypoint.external || []),
            ...(config.external || []),
        ],
        alias: {
            ...(entrypoint.alias || {}),
            ...(config.alias || {}),
        },
        jsx: entrypoint.jsx || config.jsx,
        jsxFactory: entrypoint.jsxFactory || config.jsxFactory,
        jsxFragment: entrypoint.jsxFragment || config.jsxFragment,
        jsxImportSource: entrypoint.jsxImportSource || config.jsxImportSource,
        plugins: [
            ...(entrypoint.plugins || []),
            ...(config.plugins || []),
        ],
        logLevel: config.logLevel || 'warning',
        watch: config.watch,
        entrypointsPath: entrypoint.entrypointsPath || config.entrypointsPath,
        manifestPath: entrypoint.manifestPath || config.manifestPath,
    };
}

/**
 * @param {EntrypointConfig} entrypoint
 * @param {ProjectConfig} config
 * @returns {EntrypointConfig}
 */
export function getEntryBuildConfig(entrypoint, config) {
    if (!entrypoint.output) {
        throw new Error('Missing required `output` path');
    }

    const format = entrypoint.format || config.format;

    return /** @type {EntrypointConfig} */ (getEntryConfig({
        ...entrypoint,
        globalName: entrypoint.globalName || entrypoint.name || (format === 'iife' ? camelize(entrypoint.output) : undefined),
    }, config));
}

/**
 * @param {ProjectConfig[]} entries
 * @returns {ProjectConfig}
 */
export function mergeConfig(...entries) {
    return entries
        .reduce((config, entry) => {
            const keys = /** @type {(keyof ProjectConfig)[]} */ (Object.keys(entry));

            /**
             * @type {ProjectConfig}
             */
            const clone = keys
                .reduce((config, key) => {
                    if (entry[key] != null) {
                        config[key] = entry[key];
                    }

                    return config;
                }, /** @type {*} */ ({}));

            return {
                ...config,
                ...clone,
                entrypoints: [
                    ...(config.entrypoints || []),
                    ...(clone.entrypoints || []),
                ],
                external: [
                    ...(config.external || []),
                    ...(clone.external || []),
                ],
                plugins: [
                    ...(config.plugins || []),
                    ...(clone.plugins || []),
                ],
                servePlugins: [
                    ...(config.servePlugins || []),
                    ...(clone.servePlugins || []),
                ],
            };
        }, {});
}

/**
 *
 * @param {ProjectConfig|Promise<ProjectConfig>|((input: ProjectConfig, mode: Mode) => ProjectConfig|Promise<ProjectConfig>)} inputConfig
 * @param {ProjectConfig} initialConfig
 * @param {Mode} mode
 * @returns {Promise<ProjectConfig>}
 */
async function computeConfigFile(inputConfig, initialConfig, mode) {
    if (typeof inputConfig === 'function') {
        return computeConfigFile(inputConfig(initialConfig, mode), initialConfig, mode);
    }

    if (inputConfig instanceof Promise) {
        return computeConfigFile(await inputConfig, initialConfig, mode);
    }

    return inputConfig || {};
}

/**
 * @param {string} configFile
 * @param {ProjectConfig} initialConfig
 * @param {Mode} [mode]
 * @param {string} [cwd]
 * @returns {Promise<ProjectConfig>}
 */
export async function readConfigFile(configFile, initialConfig, mode = 'build', cwd = process.cwd()) {
    configFile = path.isAbsolute(configFile) ? configFile : `./${configFile}`;
    const { default: inputConfig } = await import(pathToFileURL(path.resolve(cwd, configFile)).href);

    return computeConfigFile(inputConfig, initialConfig, mode);
}

/**
 * Find the config file of the project.
 * @param {string} root The root dir to check.
 * @returns {Promise<string|undefined>} The path of the config file.
 */
export async function locateConfigFile(root = process.cwd()) {
    const file = path.join(root, 'rna.config.js');
    try {
        await access(file);
        return file;
    } catch {
        //
    }

    return;
}
