import path from 'path';
import { getEntryConfig } from '@chialab/rna-config-loader';
import { getRequestFilePath } from '@web/dev-server-core';
import { browserResolve, isCore, isJs, isJson, isCss } from '@chialab/node-resolve';
import { isHelperImport, isOutsideRootDir, resolveRelativeImport } from '@chialab/wds-plugin-node-resolve';
import { transform, transformLoaders, loadPlugins, loadTransformPlugins, writeDevEntrypointsJson } from '@chialab/rna-bundler';

/**
 * @typedef {import('@web/dev-server-core').Plugin} Plugin
 */

/**
 * @param {Partial<import('@chialab/rna-config-loader').CoreTransformConfig>} config
 */
export default function(config) {
    /**
     * @type {import('@web/dev-server-core').DevServerCoreConfig}
     */
    let serverConfig;

    /**
     * @type {Plugin}
     */
    const plugin = {
        name: 'rna',

        async serverStart({ config }) {
            serverConfig = config;
        },

        resolveMimeType(context) {
            if (isJs(context.path) || isJson(context.path)) {
                return 'js';
            }
            if (isCss(context.path)) {
                return 'css';
            }
        },

        async transform(context) {
            if (isHelperImport(context.path)) {
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

            const { rootDir } = serverConfig;
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
                    ...(config.plugins || []),
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
                    ...(config.transformPlugins || []),
                ],
                logLevel: 'error',
            });

            const { code } = await transform(transformConfig);

            return code;
        },

        async transformImport({ source }) {
            if (source.endsWith('.json')) {
                if (source.includes('?')) {
                    return `${source}&module=json`;
                }
                return `${source}?module=json`;
            }
        },
    };

    return plugin;
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
