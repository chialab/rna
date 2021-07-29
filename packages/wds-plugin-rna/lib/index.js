import path from 'path';
import { getEntryConfig } from '@chialab/rna-config-loader';
import { getRequestFilePath, PluginSyntaxError, PluginError } from '@web/dev-server-core';
import { transform, transformLoaders, loadPlugins, loadTransformPlugins, writeDevEntrypointsJson, JS_EXTENSIONS, JSON_EXTENSIONS, CSS_EXTENSIONS } from '@chialab/rna-bundler';
import { createResolver, isCore } from '@chialab/node-resolve';

/**
 * @typedef {import('@web/dev-server-core').Plugin} Plugin
 */

/**
 * @typedef {{ source: string; context: import('@web/dev-server-core').Context; code?: string; column?: number; line?: number }} ResolveImportArgs
 */

/**
 * @param {string} url
 */
function parseUrl(url) {
    try {
        return new URL(url);
    } catch {
        return null;
    }
}

/**
 * @param {string} path
 */
function isOutsideRootDir(path) {
    return path.startsWith('/__wds-outside-root__/');
}

/**
 * @param {string} filePath
 */
function toBrowserPath(filePath) {
    return filePath.split(path.sep).join('/');
}

/**
 * @implements {Plugin}
 */
export class RnaPlugin {
    name = 'rna';

    resolver = createResolver({
        extensions: JS_EXTENSIONS,
        conditionNames: ['default', 'module', 'import', 'browser'],
        mainFields: ['module', 'esnext', 'jsnext', 'jsnext:main', 'browser', 'main'],
    });

    /**
     * @param {Partial<import('@chialab/rna-config-loader').CoreTransformConfig>} transformConfig
     */
    constructor(transformConfig = {}) {
        this.transformConfig = transformConfig;
    }

    /**
     * @param {{ config: import('@web/dev-server-core').DevServerCoreConfig }} args
     */
    async serverStart({ config }) {
        this.config = config;
    }

    /**
     * @param {import('@web/dev-server-core').Context} context
     */
    resolveMimeType(context) {
        const fileExtension = path.posix.extname(context.path);
        if (JS_EXTENSIONS.includes(fileExtension) ||
            JSON_EXTENSIONS.includes(fileExtension)) {
            return 'js';
        }
        if (CSS_EXTENSIONS.includes(fileExtension)) {
            return 'css';
        }
    }

    /**
     * @param {import('@web/dev-server-core').Context} context
     */
    async transform(context) {
        if (!this.config) {
            return;
        }

        if (context.path.includes('__web-dev-server__web-socket') ||
            context.path.includes('__web-test-runner__')) {
            return;
        }

        const fileExtension = path.posix.extname(context.path);
        const loader = transformLoaders[fileExtension];
        if (!loader) {
            return;
        }

        const rootDir = this.config.rootDir;
        const filePath = getRequestFilePath(context.url, rootDir);
        const transformConfig = getEntryConfig({
            root: rootDir,
            input: `./${path.relative(rootDir, filePath)}`,
            code: /** @type {string} */ (context.body),
            loader,
        }, {
            root: path.dirname(filePath),
            sourcemap: 'inline',
            target: 'es2020',
            plugins: [
                ...(await loadPlugins({
                    postcss: {
                        transform(importPath) {
                            if (importPath.includes('/__wds-outside-root__/')) {
                                return;
                            }

                            const normalizedPath = path.resolve(filePath, importPath);
                            if (normalizedPath.startsWith(rootDir)) {
                                return;
                            }

                            const relativePath = path.relative(rootDir, normalizedPath);
                            const dirUp = `..${path.sep}`;
                            const lastDirUpIndex = relativePath.lastIndexOf(dirUp) + 3;
                            const dirUpStrings = relativePath.substring(0, lastDirUpIndex).split(path.sep);
                            if (dirUpStrings.length === 0 || dirUpStrings.some(str => !['..', ''].includes(str))) {
                                throw new Error(`Unable to resolve ${importPath}`);
                            }

                            const importRelativePath = relativePath.substring(lastDirUpIndex).split(path.sep).join('/');
                            return `/__wds-outside-root__/${dirUpStrings.length - 1}/${importRelativePath}`;
                        },
                    },
                })),
                ...(this.transformConfig.plugins || []),
            ],
            transformPlugins: [
                ...(await loadTransformPlugins({
                    commonjs: {
                        ignore: async (specifier) => {
                            try {
                                await this.resolver(specifier, filePath);
                            } catch (err) {
                                return isCore(specifier);
                            }

                            return false;
                        },
                    },
                })),
                ...(this.transformConfig.transformPlugins || []),
            ],
            logLevel: 'error',
        });

        const { code } = await transform(transformConfig);

        return code;
    }

    /**
     * @param {ResolveImportArgs} args
     */
    async resolveImport({
        source,
        context,
        code,
        column,
        line,
    }) {
        if (!this.config) {
            return;
        }

        if (!context.response.is('js')) {
            return;
        }

        if (!path.isAbsolute(source) && parseUrl(source) != null) {
            // don't resolve relative and valid urls
            return;
        }

        // file already resolved outsided root dir
        if (isOutsideRootDir(source)) {
            return;
        }

        const rootDir = this.config.rootDir;
        const filePath = getRequestFilePath(context.url, rootDir);
        const resolvedPath = await this.resolver(source, path.dirname(filePath));

        if (resolvedPath.startsWith(rootDir)) {
            return `./${path.relative(path.dirname(filePath), resolvedPath)}`;
        }

        const relativePath = path.relative(rootDir, resolvedPath);
        const dirUp = `..${path.sep}`;
        const lastDirUpIndex = relativePath.lastIndexOf(dirUp) + 3;
        const dirUpStrings = relativePath.substring(0, lastDirUpIndex).split(path.sep);
        if (dirUpStrings.length === 0 || dirUpStrings.some(str => !['..', ''].includes(str))) {
            // we expect the relative part to consist of only ../ or ..\\
            const errorMessage = 'This path could not be converted to a browser path. Please file an issue with a reproduction.';
            if (
                typeof code === 'string' &&
                typeof column === 'number' &&
                typeof line === 'number'
            ) {
                throw new PluginSyntaxError(errorMessage, filePath, code, column, line);
            } else {
                throw new PluginError(errorMessage);
            }
        }

        const importPath = toBrowserPath(relativePath.substring(lastDirUpIndex));
        return `/__wds-outside-root__/${dirUpStrings.length - 1}/${importPath}`;
    }
}

/**
 * @param {Partial<import('@chialab/rna-config-loader').CoreTransformConfig>} [config]
 */
export default function(config) {
    return new RnaPlugin(config);
}

/**
 * @param {import('@chialab/rna-config-loader').Entrypoint[]} [entrypoints]
 * @param {string} [entrypointsPath]
 */
export function entrypointsPlugin(entrypoints = [], entrypointsPath) {
    /**
     * @type {Plugin}
     */
    const plugin = {
        name: 'rna-entrypoints',

        async serverStart(args) {
            if (entrypoints && entrypointsPath) {
                const files = entrypoints
                    .reduce((acc, { input }) => {
                        if (Array.isArray(input)) {
                            acc.push(...input);
                        } else {
                            acc.push(input);
                        }

                        return acc;
                    }, /** @type {string[]} */ ([]));

                await writeDevEntrypointsJson(files, entrypointsPath, /** @type {import('@web/dev-server-core').DevServer} */ (/** @type {unknown} */ (args)), 'esm');
            }
        },
    };

    return plugin;
}
