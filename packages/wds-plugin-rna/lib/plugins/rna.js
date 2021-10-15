import path from 'path';
import pkgUp from 'pkg-up';
import { getRequestFilePath } from '@web/dev-server-core';
import { getChunkOptions } from '@chialab/esbuild-plugin-emit';
import { getEntryConfig } from '@chialab/rna-config-loader';
import { browserResolve, isJs, isJson, isCss, fsResolve, getSearchParam, appendSearchParam, removeSearchParam, getSearchParams, ALIAS_MODE, createAliasRegexexMap, createEmptyRegex } from '@chialab/node-resolve';
import { isHelperImport, isOutsideRootDir, resolveRelativeImport } from '@chialab/wds-plugin-node-resolve';
import { transform, transformLoaders, loadPlugins, loadTransformPlugins, build } from '@chialab/rna-bundler';
import { realpath } from 'fs/promises';

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
 * @param {import('koa').Context} context
 */
export function getRequestLoader(context) {
    const fileExtension = path.posix.extname(context.path);
    return transformLoaders[fileExtension];
}

/**
 * @param {import('@chialab/rna-config-loader').Entrypoint} entrypoint
 * @param {import('@web/dev-server-core').DevServerCoreConfig} serverConfig
 * @param {Partial<import('@chialab/rna-config-loader').CoreTransformConfig>} config
 */
export async function createConfig(entrypoint, serverConfig, config) {
    const { rootDir } = serverConfig;
    const input = /** @type {string} */ (entrypoint.input);
    const filePath = path.resolve(rootDir, input);

    return getEntryConfig(entrypoint, {
        sourcemap: 'inline',
        target: 'es2020',
        platform: 'browser',
        jsxFactory: config.jsxFactory,
        jsxFragment: config.jsxFragment,
        jsxModule: config.jsxModule,
        jsxExport: config.jsxExport,
        alias: config.alias,
        plugins: [
            ...(await loadPlugins({
                postcss: {
                    alias: config.alias,
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
                commonjs: {},
                worker: {
                    proxy: true,
                },
            })),
            ...(config.transformPlugins || []),
        ],
        logLevel: 'error',
    });
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
    const aliasMap = config.alias || {};
    const aliasRegexes = createAliasRegexexMap(aliasMap, ALIAS_MODE.FULL);
    const emptyRegex = createEmptyRegex(aliasMap);

    /**
     * @type {import('@web/dev-server-core').DevServerCoreConfig}
     */
    let serverConfig;

    /**
     * @type {import('chokidar').FSWatcher}
     */
    let serverFileWatcher;

    /**
     * @type {{ [key: string]: Promise<string> }}
     */
    const virtualFs = {};

    /**
     * @type {import('@chialab/esbuild-helpers').DependenciesMap}
     */
    const dependenciesMap = {};

    /**
     * @param {import('@chialab/rna-bundler').TransformResult|import('@chialab/rna-bundler').BuildResult} result
     */
    function watchDependencies({ dependencies }) {
        const watchedDependencies = Object.values(dependenciesMap).flat();
        for (const key in dependencies) {
            if (key in dependenciesMap) {
                dependenciesMap[key]
                    .forEach((file) => {
                        if (watchedDependencies.filter((f) => f === file).length === 1) {
                            serverFileWatcher.unwatch(file);
                        }
                    });
            }

            dependencies[key]
                .forEach((file) => serverFileWatcher.add(file));
        }

        Object.assign(dependenciesMap, dependencies);
    }

    /**
     * @param {import('@chialab/rna-bundler').BuildResult} result
     */
    function addToVirtualFs(result) {
        if (!result.outputFiles) {
            return result.outputFiles;
        }
        result.outputFiles.forEach(({ path, text }) => {
            virtualFs[path] = Promise.resolve(text);
        });
    }

    /**
     * @param {string} path
     */
    function invalidateVirtualFs(path) {
        delete virtualFs[path];
    }

    /**
     * @type {Plugin}
     */
    const plugin = {
        name: 'rna',

        async serverStart({ config, fileWatcher }) {
            serverConfig = config;
            serverFileWatcher = fileWatcher;

            /**
             * @param {string} filePath
             */
            const onFileChanged = (filePath) => {
                for (const key in dependenciesMap) {
                    if (filePath === key) {
                        invalidateVirtualFs(filePath);
                        continue;
                    }

                    const list = dependenciesMap[key];
                    if (list.includes(filePath)) {
                        invalidateVirtualFs(key);
                        setTimeout(() => {
                            // debounce change event in order to correctly handle hmr queue
                            fileWatcher.emit('change', key);
                        });
                    }
                }
            };

            fileWatcher.on('change', (filePath) => onFileChanged(filePath));
            fileWatcher.on('unlink', (filePath) => onFileChanged(filePath));
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

        async serve(context) {
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

            const { rootDir } = serverConfig;
            const filePath = getRequestFilePath(context.url, rootDir);
            if (filePath in virtualFs) {
                return {
                    body: await virtualFs[filePath],
                    transformCacheKey: false,
                };
            }
        },

        async transform(context) {
            if (isHelperImport(context.url)) {
                return;
            }

            if (isCssModuleRequest(context.url) ||
                isFileRequest(context.url)
            ) {
                // do not transpile to js module
                return;
            }

            const loader = getRequestLoader(context);
            if (!loader) {
                return;
            }

            if (loader === 'json' && !isJsonModuleRequest(context.url)) {
                // do not transpile to js module
                return;
            }

            const { rootDir } = serverConfig;
            const filePath = getRequestFilePath(context.url, rootDir);
            if (filePath in virtualFs) {
                return;
            }

            const contextConfig = getChunkOptions(context.url);

            /**
             * @type {import('@chialab/rna-config-loader').Entrypoint}
             */
            const entrypoint = {
                root: rootDir,
                input: `./${path.relative(rootDir, filePath)}`,
                code: /** @type {string} */ (context.body),
                loader,
                bundle: false,
                ...contextConfig,
            };

            const transformConfig = await createConfig(entrypoint, serverConfig, config);
            const result = await transform(transformConfig);
            watchDependencies(result);

            return result.code;
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

        async resolveImport({ source, context }) {
            if (source.match(emptyRegex)) {
                return;
            }

            for (const [regex, res] of aliasRegexes.entries()) {
                if (source.match(regex)) {
                    if (!res.value) {
                        return;
                    }
                    source = res.value;
                    break;
                }
            }

            if (!isBareModuleSource(source)) {
                return;
            }

            const { rootDir } = serverConfig;
            const filePath = getRequestFilePath(context.url, rootDir);
            const resolved = await browserResolve(source, filePath).catch(() => null);
            if (!resolved) {
                return;
            }

            const realPath = await realpath(resolved);
            if (realPath !== resolved) {
                // ignore symlinked files
                return;
            }

            if (resolved in virtualFs) {
                return resolveRelativeImport(resolved, filePath, rootDir);
            }

            const modulePackageFile = await pkgUp({ cwd: resolved });
            const moduleRootDir = modulePackageFile ? path.dirname(modulePackageFile) : rootDir;

            /**
             * @type {import('@chialab/rna-config-loader').Entrypoint}
             */
            const entrypoint = {
                root: moduleRootDir,
                input: `./${path.relative(moduleRootDir, resolved)}`,
                loader: getRequestLoader(context),
                bundle: false,
            };

            virtualFs[resolved] = createConfig(entrypoint, serverConfig, config)
                .then((transformConfig) =>
                    build({
                        ...transformConfig,
                        chunkNames: '[name]-[hash]',
                        output: resolved,
                        jsxModule: undefined,
                        write: false,
                    })
                ).then((result) => {
                    if (!result.outputFiles) {
                        throw new Error('Failed to bundle dependency');
                    }

                    addToVirtualFs(result);
                    watchDependencies(result);

                    return virtualFs[resolved];
                });

            return resolveRelativeImport(resolved, filePath, rootDir);
        },
    };

    return plugin;
}
