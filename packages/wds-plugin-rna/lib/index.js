import path from 'path';
import { getEntryConfig } from '@chialab/rna-config-loader';
import { getRequestFilePath } from '@web/dev-server-core';
import { transform, transformLoaders, loadPlugins, loadTransformPlugins, writeDevEntrypointsJson, JS_EXTENSIONS, JSON_EXTENSIONS, CSS_EXTENSIONS } from '@chialab/rna-bundler';
import { isCore } from '@chialab/node-resolve';
import { resolve, resolveImport, resolveRelativeImport } from './resolveImport.js';

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

export { resolve, resolveImport, resolveRelativeImport };

/**
 * @implements {Plugin}
 */
export class RnaPlugin {
    name = 'rna';

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
                            if (isOutsideRootDir(importPath)) {
                                return;
                            }

                            const normalizedPath = path.resolve(filePath, importPath);
                            if (normalizedPath.startsWith(rootDir)) {
                                return;
                            }

                            return resolveRelativeImport(normalizedPath, filePath, rootDir);
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
                                await resolve(specifier, filePath);
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
        line,
        column,
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
        return await resolveImport(source, filePath, rootDir, { code, line, column });
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
