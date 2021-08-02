import path from 'path';
import { getEntryConfig } from '@chialab/rna-config-loader';
import { getRequestFilePath } from '@web/dev-server-core';
import { browserResolve, isCore, JS_EXTENSIONS, JSON_EXTENSIONS, CSS_EXTENSIONS } from '@chialab/node-resolve';
import { transform, transformLoaders, loadPlugins, loadTransformPlugins, writeDevEntrypointsJson } from '@chialab/rna-bundler';
import { resolveImport, resolveRelativeImport, isOutsideRootDir } from './resolveImport.js';

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
 * Relative and valid urls should not be resolved.
 * @param {string} url
 */
function skipResolve(url) {
    return !path.isAbsolute(url) && parseUrl(url) != null;
}

export * from './resolveImport.js';

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
        if (JS_EXTENSIONS.includes(fileExtension)) {
            return 'js';
        }
        if (JSON_EXTENSIONS.includes(fileExtension)) {
            return 'js';
        }
        if (CSS_EXTENSIONS.includes(fileExtension)) {
            return 'css';
        }
    }

    /**
     * @param {import('@web/dev-server-core').Context} context
     */
    async serve(context) {
        if (context.path.includes('__rna-empty__')) {
            return '';
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

        if (typeof context.body === 'string' && context.URL.searchParams.get('module') === 'style') {
            return {
                body: `var link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '${context.path}';
document.head.appendChild(link);
`,
                headers: {
                    'Content-Type': 'text/javascript',
                },
            };
        }

        const fileExtension = path.posix.extname(context.path);
        const loader = transformLoaders[fileExtension];
        if (!loader) {
            return;
        }

        if (loader === 'json') {
            if (context.URL.searchParams.get('module') !== 'json') {
                return;
            }
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
            platform: 'browser',
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
                                await browserResolve(specifier, filePath);
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
    async resolveImport({ source, context, code, line, column }) {
        if (!this.config) {
            return;
        }

        if (!context.response.is('js')) {
            return;
        }

        const alias = this.transformConfig.alias || {};
        if (source in alias) {
            const aliased = alias[source];
            if (!aliased) {
                return 'export default {}\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJtYXBwaW5ncyI6IkEifQ==';
            }
            source = aliased;
        }

        if (skipResolve(source)) {
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

    /**
     * @param {ResolveImportArgs} options
     */
    async transformImport({ source }) {
        if (source.endsWith('.json')) {
            if (source.includes('?')) {
                return `${source}&module=json`;
            }
            return `${source}?module=json`;
        }
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
