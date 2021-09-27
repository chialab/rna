import path from 'path';
import { getRequestFilePath } from '@web/dev-server-core';
import { getChunkOptions } from '@chialab/esbuild-plugin-emit';
import { getEntryConfig } from '@chialab/rna-config-loader';
import { browserResolve, isCore, isJs, isJson, isCss, fsResolve, getSearchParam, appendSearchParam, removeSearchParam, getSearchParams } from '@chialab/node-resolve';
import { isHelperImport, isOutsideRootDir, resolveRelativeImport } from '@chialab/wds-plugin-node-resolve';
import { transform, transformLoaders, loadPlugins, loadTransformPlugins, build } from '@chialab/rna-bundler';

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
 * @param {string} url
 */
export function shouldSkip(url) {
    return getSearchParam(url, 'skip') === '1';
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
export function appendSkipParam(source) {
    return appendSearchParam(source, 'skip', '1');
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

const VALID_MODULE_NAME = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

/**
 * @param {string} name
 */
function isBareModuleSource(name) {
    return VALID_MODULE_NAME.test(name);
}

/**
 * @param {Partial<import('@chialab/rna-config-loader').CoreTransformConfig>} config
 */
export function rnaPlugin(config) {
    /**
     * @type {import('@web/dev-server-core').DevServerCoreConfig}
     */
    let serverConfig;

    /**
     * @type {{ [key: string]: Promise<string|void>|undefined }}
     */
    const cache = {};

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

            if (shouldSkip(context.url)) {
                return {
                    body: (/** @type {string} */ (context.body)),
                };
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

            /**
             * @type {import('@chialab/rna-config-loader').Entrypoint}
             */
            const entrypoint = {
                root: rootDir,
                input: `./${path.relative(rootDir, filePath)}`,
                code: /** @type {string} */ (context.body),
                loader,
                bundle: false,
                ...getChunkOptions(context.url),
            };
            const transformConfig = getEntryConfig(entrypoint, {
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
                        worker: {
                            proxy: true,
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

        async resolveImport({ source, context, code, line, column }) {
            if (config.alias && config.alias[source]) {
                source = /** @type {string} */ (config.alias[source]);
            }

            if (!isBareModuleSource(source)) {
                return;
            }

            const { rootDir } = serverConfig;
            const filePath = getRequestFilePath(context.url, rootDir);
            const entry = await browserResolve(source, filePath);

            const promise = cache[entry] = cache[entry] || Promise.resolve()
                .then(async () => {
                    try {
                        const outputDir = path.join(path.dirname(entry), 'bundled');
                        const result = await build({
                            input: entry,
                            output: outputDir,
                            root: rootDir,
                            format: 'esm',
                            bundle: true,
                            sourcemap: false,
                            target: 'es2020',
                            platform: 'browser',
                            jsxFactory: config.jsxFactory,
                            jsxFragment: config.jsxFragment,
                            jsxModule: config.jsxModule,
                            jsxExport: config.jsxExport,
                            entryNames: '[name]-[hash]',
                            chunkNames: '[name]-[hash]',
                            assetNames: '[name]-[hash]',
                            define: {},
                            alias: {},
                            minify: true,
                            clean: true,
                            splitting: false,
                            external: [],
                            plugins: [
                                {
                                    name: 'make-all-packages-external',
                                    setup(build) {
                                        // Must not start with "/" or "./" or "../"
                                        const filter = /^[^./]|^\.[^./]|^\.\.[^/]/;
                                        build.onResolve({ filter }, args => ({ path: args.path, external: true }));
                                    },
                                },
                                ...await loadPlugins(),
                            ],
                            transformPlugins: await loadTransformPlugins({
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
                            }),
                            logLevel: 'error',
                            publicPath: '/',
                        });

                        const outputs = Object.keys((/** @type {import('esbuild').Metafile} */ (result.metafile)).outputs);
                        if (!outputs.length) {
                            return;
                        }

                        return path.resolve(rootDir, outputs[0]);
                    } catch (err) {
                        //
                    }
                });

            const modulePath = await promise;
            if (modulePath) {
                return appendSkipParam(resolveRelativeImport(modulePath, filePath, rootDir, { code, line, column }));
            }
        },
    };

    return plugin;
}
