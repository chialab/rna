import path from 'path';
import { getRequestFilePath } from '@web/dev-server-core';
import { getChunkOptions } from '@chialab/esbuild-plugin-emit';
import { getEntryConfig } from '@chialab/rna-config-loader';
import { browserResolve, isCore, isJs, isJson, isCss, fsResolve, getSearchParam, appendSearchParam, removeSearchParam, getSearchParams } from '@chialab/node-resolve';
import { isHelperImport, isOutsideRootDir, resolveRelativeImport } from '@chialab/wds-plugin-node-resolve';
import { transform, transformLoaders, loadPlugins, loadTransformPlugins, writeDevEntrypointsJson } from '@chialab/rna-bundler';

/**
 * @typedef {import('@web/dev-server-core').Plugin} Plugin
 */

/**
 * @param {string} url
 */
export function isFileRequest(url) {
    return ['file', 'chunk'].includes(getSearchParam(url, 'emit') || '') || getSearchParam(url, 'loader') === 'file';
}

/**
 * @param {string} url
 */
export function isCssModuleRequest(url) {
    return getSearchParam(url, 'loader') === 'css';
}

/**
 * @param {string} url
 */
export function isJsonModuleRequest(url) {
    return getSearchParam(url, 'loader') === 'json';
}

/**
 * @param {string} source
 */
export function appendCssModuleParam(source) {
    return appendSearchParam(source, 'loader', 'css');
}

/**
 * @param {string} source
 */
export function appendJsonModuleParam(source) {
    return appendSearchParam(source, 'loader', 'json');
}

/**
 * @param {string} source
 */
export function appendFileParam(source) {
    return appendSearchParam(source, 'loader', 'file');
}

/**
 * @param {string} source
 */
export function convertCssToJsModule(source) {
    source = removeSearchParam(source, 'loader');
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
    source = removeSearchParam(source, 'emit');
    source = removeSearchParam(source, 'loader');
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
                isCssModuleRequest(context.url) ||
                isFileRequest(context.url)) {
                return 'js';
            }
            if (isCss(context.path)) {
                return 'css';
            }
        },

        serve(context) {
            if (isFileRequest(context.url)) {
                const { rootDir } = serverConfig;
                const { path: pathname, searchParams } = getSearchParams(context.url);
                const filePath = resolveRelativeImport(getRequestFilePath(pathname, rootDir), context.url, rootDir);
                return {
                    body: convertFileToJsModule(`${filePath}?${searchParams.toString()}`),
                    headers: {
                        'content-type': 'text/javascript',
                    },
                };
            }
            if (isCssModuleRequest(context.url)) {
                return {
                    body: convertCssToJsModule(context.url),
                    headers: {
                        'content-type': 'text/javascript',
                    },
                };
            }
        },

        async transform(context) {
            if (isHelperImport(context.path)) {
                return;
            }

            if (isCssModuleRequest(context.url) ||
                isFileRequest(context.url)
            ) {
                // do not transpile to js module
                return;
            }

            const fileExtension = path.posix.extname(context.path);
            const loader = transformLoaders[fileExtension];
            if (!loader) {
                return;
            }

            if (loader === 'json' && !isJsonModuleRequest(context.url)) {
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
                ...getChunkOptions(context.url),
            }, {
                sourcemap: 'inline',
                target: 'es2020',
                platform: 'browser',
                jsxFactory: config.jsxFactory,
                jsxFragment: config.jsxFragment,
                jsxModule: config.jsxModule,
                jsxExport: config.jsxExport,
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
