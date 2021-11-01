import path from 'path';
import { readFile } from 'fs/promises';
import { appendSearchParam, hasSearchParam, getSearchParam, getSearchParams, browserResolve, resolve as nodeResolve } from '@chialab/node-resolve';
import { loadSourcemap, inlineSourcemap, mergeSourcemaps } from '@chialab/estransform';
import { setupPlugin } from './setupPlugin.js';
import { collectDependencies } from './collectDependencies.js';
import { getRootDir, getOutputDir, getStdinInput } from './options.js';

export * from './setupPlugin.js';
export * from './createResult.js';
export * from './collectDependencies.js';
export * from './buildFile.js';

/**
 * Get the entrypoint ouput from an esbuild result metafile.
 * This is useful when you need to build multiple files using the `outdir` option
 * and you don't know the name of the resulting file.
 * @param {string[]} entryPoints The list of build entrypoints.
 * @param {import('esbuild').Metafile} metafile The result metafile from esbuild.
 * @param {string} rootDir The root dir of the build.
 * @return {string}
 */
export function getMainOutput(entryPoints, metafile, rootDir = process.cwd()) {
    const outputs = metafile.outputs;
    const outFile = Object.keys(outputs)
        .filter((output) => !output.endsWith('.map'))
        .filter((output) => outputs[output].entryPoint)
        .find((output) => entryPoints.includes(
            path.resolve(
                rootDir,
                /** @type {string} */(outputs[output].entryPoint?.replace(/^\w+:/, ''))
            )
        ));

    return path.resolve(rootDir, /** @type {string} */ (outFile));
}

/**
 * @typedef {import('esbuild').OnResolveOptions} OnResolveOptions
 */

/**
 * @typedef {import('esbuild').OnResolveArgs} OnResolveArgs
 */

/**
 * @typedef {import('esbuild').OnResolveResult} OnResolveResult
 */

/**
 * @typedef {(args: OnResolveArgs) => OnResolveResult | Promise<OnResolveResult | null | undefined> | null | undefined} ResolveCallback
 */

/**
 * @typedef {import('esbuild').OnLoadOptions} OnLoadOptions
 */

/**
 * @typedef {import('esbuild').OnLoadArgs} OnLoadArgs
 */

/**
 * @typedef {import('esbuild').OnLoadResult} OnLoadResult
 */

/**
 * @typedef {(args: OnLoadArgs) => OnLoadResult | Promise<OnLoadResult | null | undefined> | null | undefined} LoadCallback
 */

/**
 * @typedef {import('esbuild').OnLoadArgs & { code?: string }} OnTransformArgs
 */

/**
 * @typedef {{ filter?: RegExp, loaders?: import('esbuild').Loader[], namespace?: string }} OnTransformOptions
 */

/**
 * @typedef {{ code: string, map?: import('@chialab/estransform').SourceMap }} OnTransformResult
 */

/**
 * @typedef {(args: Required<OnTransformArgs>) => OnTransformResult | Promise<OnTransformResult | null | undefined> | null | undefined} TransformCallback
 */

/**
 * @typedef {Object} BuildCallbacks
 * @property {{ options: OnResolveOptions, callback: ResolveCallback }[]} resolve
 * @property {Map<string, OnResolveResult>} resolved
 * @property {{ options: OnLoadOptions, callback: LoadCallback }[]} load
 * @property {{ options: OnTransformOptions, callback: TransformCallback }[]} transform
 */

/**
 * @typedef {import('esbuild').Metafile} Metafile
 */

/**
 * @typedef {import('esbuild').BuildResult & { metafile: Metafile, outputFiles?: import('esbuild').OutputFile[] }} BuildResult
 */

/**
 * @typedef {Object} EmitTransformOptions
 * @property {boolean} [bundle]
 * @property {boolean} [splitting]
 * @property {import('esbuild').Platform} [platform]
 * @property {import('esbuild').Format} [format]
 * @property {import('esbuild').Plugin[]} [plugins]
 * @property {string[]} [inject]
 */

/**
 * The filter regex for file imports.
 */
const EMIT_FILE_REGEX = /(\?|&)emit=file/;

/**
 * The namespace for emitted chunks.
 */
const EMIT_CHUNK_NS = 'emit-chunk';

/**
 * The filter regex for chunk imports.
 */
const EMIT_CHUNK_REGEX = /(\?|&)emit=chunk/;

/**
 * @type {WeakMap<import('esbuild').BuildOptions, BuildCallbacks>}
 */
const buildInternals = new WeakMap();

/**
 * @param {import('esbuild').PluginBuild} build
 */
export function useRna(build) {
    const onResolve = build.onResolve;
    const onLoad = build.onLoad;
    /**
     * @type {BuildCallbacks}
     */
    const callbacks = buildInternals.get(build.initialOptions) || {
        resolve: [],
        resolved: new Map(),
        load: [],
        transform: [],
    };
    buildInternals.set(build.initialOptions, callbacks);

    const rnaBuild = {
        rootDir: getRootDir(build),
        outDir: getOutputDir(build),
        stdin: getStdinInput(build),
        /**
         * @param {OnResolveArgs} args
         */
        resolve(args) {
            return resolve(build, args);
        },
        /**
         * @param {OnLoadArgs} args
         */
        load(args) {
            return load(build, args);
        },
        /**
         * @param {OnTransformArgs} args
         */
        transform(args) {
            return transform(build, args);
        },
        /**
         * Get the base uri reference.
         */
        getBaseUrl() {
            const { platform, format } = build.initialOptions;

            if (platform === 'browser' && format !== 'esm') {
                return 'document.baseURI';
            }

            if (platform === 'node' && format !== 'esm') {
                return '\'file://\' + __filename';
            }

            return 'import.meta.url';
        },
        /**
         * Programmatically emit file reference.
         * @param {string} source The path of the file.
         */
        emitFile(source) {
            return appendSearchParam(source, 'emit', 'file');
        },
        /**
         * Programmatically emit a chunk reference.
         * @param {string} source The path of the chunk.
         * @param {EmitTransformOptions} options Esbuild transform options.
         */
        emitChunk(source, options = {}) {
            return appendSearchParam(appendSearchParam(source, 'emit', 'chunk'), 'transform', JSON.stringify(options));
        },
        /**
         * @param {import('esbuild').PluginBuild} build
         * @param {string} source
         * @param {EmitTransformOptions} options
         */
        emitFileOrChunk(build, source, options = {}) {
            if (hasSearchParam(source, 'emit')) {
                return source;
            }

            const loaders = build.initialOptions.loader || {};
            const loader = loaders[path.extname(source)] || 'file';
            if (loader !== 'file' && loader !== 'json') {
                return rnaBuild.emitChunk(source, options);
            }

            return rnaBuild.emitFile(source);
        },
        /**
         * Extract esbuild transform options for the chunk endpoint.
         * @param {string} entryPoint
         * @return {EmitTransformOptions}
         */
        getChunkOptions(entryPoint) {
            const transform = getSearchParam(entryPoint, 'transform') || '{}';
            return JSON.parse(transform);
        },
        /**
         * @param {OnResolveOptions} options
         * @param {ResolveCallback} callback
         */
        onResolve(options, callback) {
            onResolve.call(build, options, callback);
            callbacks.resolve.push({ options, callback });
        },
        /**
         * @param {OnLoadOptions} options
         * @param {LoadCallback} callback
         */
        onLoad(options, callback) {
            onLoad.call(build, options, callback);
            callbacks.load.push({ options, callback });
        },
        /**
         * @param {OnTransformOptions} options
         * @param {TransformCallback} callback
         */
        onTransform(options, callback) {
            const { loader: loaders = {} } = build.initialOptions;
            const filter = options.filter = options.filter || (() => {
                const keys = Object.keys(loaders);
                const filterLoaders = options.loaders || [];
                const tsxExtensions = keys.filter((key) => filterLoaders.includes(loaders[key]));
                return new RegExp(`\\.(${tsxExtensions.map((ext) => ext.replace('.', '')).join('|')})$`);
            })();
            onLoad.call(build, { filter }, (args) => transform(build, args));
            callbacks.transform.push({ options, callback });
        },
        /**
         * Insert dependency plugins in the build plugins list.
         * @param {import('esbuild').Plugin} plugin The current plugin.
         * @param {import('esbuild').Plugin[]} plugins A list of required plugins .
         * @param {'before'|'after'} [mode] Where insert the missing plugin.
         */
        setupPlugin(plugin, plugins, mode = 'before') {
            return setupPlugin(build, plugin, plugins, mode);
        },
        /**
         * @param {string} importer
         * @param {string[]} dependencies
         */
        collectDependencies(importer, dependencies) {
            return collectDependencies(build, importer, dependencies);
        },
    };

    return rnaBuild;
}

/**
 * @param {import('esbuild').PluginBuild} build
 * @param {OnResolveArgs} args
 * @return {Promise<OnResolveResult>}
 */
export async function resolve(build, args) {
    const callbacks = buildInternals.get(build.initialOptions);
    if (!callbacks) {
        return args;
    }

    if (callbacks.resolved.has(args.path)) {
        return /** @type {OnResolveResult} */ (callbacks.resolved.get(args.path));
    }

    const { namespace = 'file', path } = args;
    for (const { options, callback } of callbacks.resolve) {
        const { namespace: optionsNamespace = 'file', filter } = options;
        if (namespace !== optionsNamespace) {
            continue;
        }

        if (!filter.test(path)) {
            continue;
        }

        const result = await callback(args);
        if (result && result.path) {
            callbacks.resolved.set(result.path, result);
            return result;
        }
    }

    const result = build.initialOptions.platform === 'browser' ?
        await browserResolve(args.path, args.importer) :
        await nodeResolve(args.path, args.importer);

    callbacks.resolved.set(result, { ...args, path: result });
    return {
        ...args,
        path: result,
    };
}

/**
 * @param {import('esbuild').PluginBuild} build
 * @param {OnLoadArgs} args
 * @return {Promise<OnLoadResult>}
 */
export async function load(build, args) {
    const callbacks = buildInternals.get(build.initialOptions);
    const { namespace = 'file', path } = args;
    if (!callbacks) {
        return {
            contents: await readFile(path, 'utf-8'),
        };
    }

    const { load } = callbacks;
    for (const { options, callback } of load) {
        const { namespace: optionsNamespace = 'file', filter } = options;
        if (namespace !== optionsNamespace) {
            continue;
        }

        if (!filter.test(path)) {
            continue;
        }

        const result = await callback(args);
        if (result) {
            return result;
        }
    }

    return {
        contents: await readFile(path, 'utf-8'),
    };
}

const cache = [];

/**
 * @param {import('esbuild').PluginBuild} build
 * @param {OnTransformArgs} args
 * @return {Promise<OnLoadResult>}
 */
export async function transform(build, args) {
    const callbacks = buildInternals.get(build.initialOptions);
    const stdin = getStdinInput(build);
    const loader = args.path.endsWith('.ts') ? 'ts' : 'tsx';

    let code = args.code = args.code ||
        (stdin && args.path === stdin.path && stdin.contents) ||
        await readFile(args.path, 'utf-8');

    if (!callbacks) {
        return {
            contents: code,
            loader,
        };
    }

    const { namespace = 'file', path } = args;
    const { transform } = callbacks;

    cache.push(args.path);
    const maps = [];
    for (const { options, callback } of transform) {
        const { namespace: optionsNamespace = 'file', filter } = options;
        if (namespace !== optionsNamespace) {
            continue;
        }

        if (!(/** @type {RegExp} */ (filter)).test(path)) {
            continue;
        }

        const result = await callback({
            ...args,
            code,
        });
        if (result) {
            code = result.code;
            if (result.map) {
                maps.push(result.map);
            }
        }
    }

    if (code === args.code) {
        return {
            contents: code,
            loader,
        };
    }

    if (maps.length) {
        const inputSourcemap = await loadSourcemap(code, path);
        if (inputSourcemap) {
            maps.unshift(inputSourcemap);
        }
    }

    const sourceMap = maps.length > 1 ? await mergeSourcemaps(maps) : maps[0];

    return {
        contents: sourceMap ? inlineSourcemap(code, sourceMap) : code,
        loader,
    };
}

/**
 * @typedef {Object} PluginOptions
 * @property {boolean} [warn]
 * @property {typeof import('esbuild')} [esbuild]
 */

/**
 * @param {PluginOptions} [options]
 */
export function rnaPlugin({ warn = true, esbuild } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'rna',
        setup(build) {
            const { onResolve, onLoad, rootDir, outDir, getChunkOptions } = useRna(build);
            const { loader = {} } = build.initialOptions;

            build.onResolve = onResolve;
            build.onLoad = onLoad;

            if (warn) {
                const plugins = build.initialOptions.plugins || [];
                const first = plugins[0];
                if (first && first.name !== 'rna') {
                    // eslint-disable-next-line no-console
                    console.warn('The "rna" plugin should be the first of the plugins list.');
                }
            }

            onResolve({ filter: EMIT_FILE_REGEX }, (args) => {
                const realPath = getSearchParams(args.path).path;
                const ext = path.extname(realPath);
                if (!loader[ext] || loader[ext] === 'file') {
                    return {
                        path: realPath,
                    };
                }

                return {
                    path: realPath,
                    pluginData: {
                        loader: 'file',
                    },
                };
            });

            onLoad({ filter: /./ }, async (args) => {
                if (args.pluginData?.loader !== 'file') {
                    return;
                }
                return {
                    contents: await readFile(args.path, 'utf-8'),
                    loader: 'file',
                };
            });

            onResolve({ filter: EMIT_CHUNK_REGEX }, (args) => ({
                path: getSearchParams(args.path).path,
                namespace: EMIT_CHUNK_NS,
                pluginData: getChunkOptions(args.path),
            }));

            onLoad({ filter: /./, namespace: EMIT_CHUNK_NS }, async ({ path: filePath, pluginData }) => {
                esbuild = esbuild || await import('esbuild');

                /** @type {import('esbuild').BuildOptions} */
                const config = {
                    ...build.initialOptions,
                    ...pluginData,
                    globalName: undefined,
                    entryPoints: [filePath],
                    outfile: undefined,
                    outdir: outDir,
                    metafile: true,
                };

                if (config.define) {
                    delete config.define['this'];
                }

                const result = /** @type { BuildResult} */ (await esbuild.build(config));
                filePath = getMainOutput([filePath], result.metafile, rootDir);

                return {
                    contents: await readFile(filePath),
                    loader: 'file',
                };
            });
        },
    };

    return plugin;
}
