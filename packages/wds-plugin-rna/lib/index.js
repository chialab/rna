import path from 'path';
import { getRequestFilePath } from '@web/dev-server-core';
import { getEntryConfig } from '@chialab/rna-config-loader';
import { browserResolve, isCore, isJs, isJson, isCss, fsResolve } from '@chialab/node-resolve';
import { isHelperImport, isOutsideRootDir, resolveRelativeImport } from '@chialab/wds-plugin-node-resolve';
import { REQUEST_PARAM as FILE_REQUEST_PARAM, appendFileParam } from '@chialab/esbuild-plugin-meta-url';
import { REQUEST_PARAM as WORKER_REQUEST_PARAM, appendWorkerParam } from '@chialab/esbuild-plugin-worker';
import { transform, transformLoaders, loadPlugins, loadTransformPlugins, writeDevEntrypointsJson } from '@chialab/rna-bundler';

/**
 * @typedef {import('@web/dev-server-core').Plugin} Plugin
 */

/**
 * @param {import('@web/dev-server-core').Context} context
 */
export function isFileRequest(context) {
    return context.URL.searchParams.get(FILE_REQUEST_PARAM.name) === FILE_REQUEST_PARAM.value;
}

/**
 * @param {import('@web/dev-server-core').Context} context
 */
export function isWorkerRequest(context) {
    return context.URL.searchParams.get(WORKER_REQUEST_PARAM.name) === WORKER_REQUEST_PARAM.value;
}

/**
 * @param {import('@web/dev-server-core').Context} context
 */
export function isCssModuleRequest(context) {
    return context.URL.searchParams.get('loader') === 'css';
}

/**
 * @param {import('@web/dev-server-core').Context} context
 */
export function isJsonModuleRequest(context) {
    return context.URL.searchParams.get('loader') === 'json';
}

/**
 * @param {string} source
 */
export function appendCssModuleParam(source) {
    if (source.match(/(\?|&)loader=css/)) {
        return source;
    }
    if (source.includes('?')) {
        return `${source}&loader=css`;
    }
    return `${source}?loader=css`;
}

/**
 * @param {string} source
 */
export function appendJsonModuleParam(source) {
    if (source.match(/(\?|&)loader=json/)) {
        return source;
    }
    if (source.includes('?')) {
        return `${source}&loader=json`;
    }
    return `${source}?loader=json`;
}

/**
 * @param {string} source
 */
export function convertCssToJsModule(source) {
    return `var link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '${source}';
document.head.appendChild(link);
`;
}

/**
 * @param {string} source
 */
export function convertFileToJsModule(source) {
    return `export default new URL('${source}', import.meta.url).href;`;
}

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
            if (isJs(context.path) ||
                isJson(context.path) ||
                isCssModuleRequest(context) ||
                isFileRequest(context) ||
                isWorkerRequest(context)) {
                return 'js';
            }
            if (isCss(context.path)) {
                return 'css';
            }
        },

        serve(context) {
            if (isFileRequest(context)) {
                const { rootDir } = serverConfig;
                const filePath = getRequestFilePath(context.url, rootDir);
                if (!context.body) {
                    context.body = convertFileToJsModule(resolveRelativeImport(filePath, context.path, rootDir));
                    context.headers['content-type'] = 'text/javascript';
                    return;
                }
            }
            if (isCssModuleRequest(context)) {
                context.body = convertCssToJsModule(context.path);
                context.headers['content-type'] = 'text/javascript';
                return;
            }
        },

        async transform(context) {
            if (isHelperImport(context.path)) {
                return;
            }

            if (isCssModuleRequest(context) ||
                isFileRequest(context) ||
                isWorkerRequest(context)
            ) {
                // do not transpile to js module
                return;
            }

            const fileExtension = path.posix.extname(context.path);
            const loader = transformLoaders[fileExtension];
            if (!loader) {
                return;
            }

            if (loader === 'json' && !isJsonModuleRequest(context)) {
                // do not transpile to js module
                return;
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
                            async transform(importPath) {
                                if (isOutsideRootDir(importPath)) {
                                    return;
                                }

                                return resolveRelativeImport(
                                    await fsResolve(importPath, filePath),
                                    filePath,
                                    rootDir
                                );
                            },
                        },
                    })),
                    ...(config.plugins || []),
                ],
                transformPlugins: [
                    ...(await loadTransformPlugins({
                        metaUrl: {
                            transformUrl(specifier, importer) {
                                return resolveRelativeImport(specifier, importer, rootDir);
                            },
                        },
                        worker: {
                            transformUrl(specifier, importer) {
                                return appendWorkerParam(resolveRelativeImport(specifier, importer, rootDir));
                            },
                        },
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
            if (isJson(source)) {
                return appendJsonModuleParam(source);
            }

            if (isCss(source)) {
                return appendCssModuleParam(source);
            }

            if (!isJs(source)) {
                return appendFileParam(source);
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
