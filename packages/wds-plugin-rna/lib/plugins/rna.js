import path from 'path';
import { getRequestFilePath } from '@chialab/es-dev-server';
import { getEntryConfig } from '@chialab/rna-config-loader';
import { pkgUp, browserResolve, isJs, isJson, isCss, getSearchParam, appendSearchParam, removeSearchParam, getSearchParams, ALIAS_MODE, createAliasRegexexMap, createEmptyRegex } from '@chialab/node-resolve';
import { isHelperImport, resolveRelativeImport } from '@chialab/wds-plugin-node-resolve';
import { transform, transformLoaders, build } from '@chialab/rna-bundler';
import { realpath } from 'fs/promises';

/**
 * @typedef {import('@chialab/es-dev-server').Plugin} Plugin
 */

/**
 * @param {string} url
 */
export function isFileRequest(url) {
    return getSearchParam(url, 'loader') === 'file';
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
 * @param {import('koa').Context} context
 */
export function isPlainScript(context) {
    const headers = context.headers;
    if ('sec-fetch-mode' in headers) {
        return headers['sec-fetch-mode'] === 'no-cors';
    }
    if (!context['origin']) {
        return true;
    }

    return false;
}

/**
 * @param {import('@chialab/rna-config-loader').Entrypoint} entrypoint
 * @param {Partial<import('@chialab/rna-config-loader').CoreTransformConfig>} config
 */
export async function createConfig(entrypoint, config) {
    return getEntryConfig(entrypoint, {
        sourcemap: 'inline',
        target: config.target || 'es2020',
        platform: 'browser',
        jsxFactory: config.jsxFactory,
        jsxFragment: config.jsxFragment,
        jsxModule: config.jsxModule,
        jsxExport: config.jsxExport,
        alias: config.alias,
        plugins: [
            ...await Promise.all([
                import('@chialab/esbuild-plugin-worker')
                    .then(({ default: plugin }) => plugin({
                        proxy: true,
                        emit: false,
                    })),
                import('@chialab/esbuild-plugin-meta-url')
                    .then(({ default: plugin }) => plugin({
                        emit: false,
                    })),
                import('@chialab/esbuild-plugin-postcss')
                    .then(({ default: plugin }) => plugin())
                    .catch(() => ({ name: 'postcss', setup() { } })),
            ]),
            ...(config.plugins || []),
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
     * @type {{ [key: string]: Promise<Buffer> }}
     */
    const virtualFs = {};

    /**
     * @type {import('@chialab/esbuild-rna').DependenciesMap}
     */
    const dependenciesMap = {};

    /**
     * @param {import('@chialab/rna-bundler').TransformResult|import('@chialab/esbuild-rna').Result} result
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
                    body: /** @type {string} */ (/** @type {unknown} */ (await virtualFs[filePath])),
                    transformCacheKey: false,
                };
            }

            const accepts = context.request.headers['accept'] || '';
            if (filePath && accepts.includes('text/css')) {
                /**
                 * @type {import('@chialab/rna-config-loader').Entrypoint}
                 */
                const entrypoint = {
                    root: rootDir,
                    input: filePath,
                    output: filePath,
                    loader: 'css',
                    bundle: true,
                };

                virtualFs[filePath] = createConfig(entrypoint, config)
                    .then(async (transformConfig) => {
                        const result = await build({
                            ...transformConfig,
                            entryNames: '[name]',
                            assetNames: '[name]',
                            chunkNames: '[name]',
                            output: filePath,
                            write: false,
                        });

                        const outputFiles = /** @type {import('esbuild').OutputFile[]} */ (result.outputFiles);
                        outputFiles.forEach(({ path, contents }) => {
                            virtualFs[path] = Promise.resolve(
                                Buffer.from(contents.buffer.slice(contents.byteOffset, contents.byteLength + contents.byteOffset))
                            );
                        });

                        watchDependencies(result);

                        return virtualFs[filePath];
                    });

                return {
                    body: /** @type {string} */ (/** @type {unknown} */ (await virtualFs[filePath])),
                    headers: {
                        'content-type': 'text/css',
                    },
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

            const contextConfig = JSON.parse(getSearchParam(context.url, 'transform') || '{}');

            /**
             * @type {import('@chialab/rna-config-loader').Entrypoint}
             */
            const entrypoint = {
                root: rootDir,
                input: `./${path.relative(rootDir, filePath)}`,
                code: /** @type {string} */ (context.body),
                loader,
                ...contextConfig,
                bundle: isPlainScript(context),
            };

            const transformConfig = await createConfig(entrypoint, config);
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

            if (config.jsxModule && source === '__jsx__.js') {
                source = config.jsxModule;
            }

            const { rootDir } = serverConfig;
            const filePath = getRequestFilePath(context.url, rootDir);

            for (const [regex, res] of aliasRegexes.entries()) {
                if (source.match(regex)) {
                    const aliasValue = res.value;
                    const aliased = typeof aliasValue === 'function' ?
                        await aliasValue(source, filePath) :
                        aliasValue;
                    if (!aliased) {
                        return;
                    }

                    source = aliased;
                    break;
                }
            }

            if (!isBareModuleSource(source)) {
                return;
            }

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

            virtualFs[resolved] = createConfig(entrypoint, config)
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

                    result.outputFiles.forEach(({ path, contents }) => {
                        virtualFs[path] = Promise.resolve(
                            Buffer.from(contents.buffer.slice(contents.byteOffset, contents.byteLength + contents.byteOffset))
                        );
                    });

                    watchDependencies(result);

                    return virtualFs[resolved];
                });

            return resolveRelativeImport(resolved, filePath, rootDir);
        },
    };

    return plugin;
}
