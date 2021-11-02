import path from 'path';
import crypto from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { appendSearchParam, browserResolve, resolve as nodeResolve } from '@chialab/node-resolve';
import { loadSourcemap, inlineSourcemap, mergeSourcemaps } from '@chialab/estransform';
import { setupPlugin } from './setupPlugin.js';
import { collectDependencies } from './collectDependencies.js';
import { getRootDir, getOutputDir, getStdinInput } from './options.js';
import { assignToResult, createResult } from './createResult.js';

export * from './setupPlugin.js';
export * from './createResult.js';
export * from './collectDependencies.js';

/**
 * Get the entrypoint ouput from an esbuild result metafile.
 * This is useful when you need to build multiple files using the `outdir` option
 * and you don't know the name of the resulting file.
 * @param {string[]} entryPoints The list of build entrypoints.
 * @param {import('esbuild').Metafile} metafile The result metafile from esbuild.
 * @param {string} rootDir The root dir of the build.
 * @return {string[]}
 */
export function getOutputFiles(entryPoints, metafile, rootDir = process.cwd()) {
    entryPoints = entryPoints.map((entryPoint) => path.resolve(rootDir, entryPoint));

    const outputs = metafile.outputs;
    const outFile = Object.keys(outputs)
        .filter((output) => !output.endsWith('.map'))
        .filter((output) => outputs[output].entryPoint)
        .find((output) =>
            entryPoints.includes(path.resolve(rootDir, /** @type {string} */ (outputs[output].entryPoint)))
        );

    if (!outFile) {
        return [];
    }

    const files = [outFile];

    /**
     * JavaScript sources can resulting in two files:
     * - the built script file
     * - the referenced style file with all imported css
     * This file is not collected by esbuild as an artifact of the source file,
     * so we are going to manually create the association.
     */
    const externalCss = outFile.replace(/\.js$/, '.css');
    if (path.extname(outFile) === '.js' && outputs[externalCss]) {
        files.push(externalCss);
    }
    return files;
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
 * @typedef {import('esbuild').OnLoadArgs & { code?: string | Uint8Array, loader?: import('esbuild').Loader, resolveDir?: string }} OnTransformArgs
 */

/**
 * @typedef {{ filter?: RegExp, loaders?: import('esbuild').Loader[], namespace?: string }} OnTransformOptions
 */

/**
 * @typedef {{ code: string, map?: import('@chialab/estransform').SourceMap, resolveDir?: string }} OnTransformResult
 */

/**
 * @typedef {(args: import('esbuild').OnLoadArgs & { code: string | Uint8Array, loader: import('esbuild').Loader, resolveDir?: string }) => OnTransformResult | Promise<OnTransformResult | null | undefined> | null | undefined} TransformCallback
 */

/**
 * @typedef {Object} BuildCallbacks
 * @property {{ options: OnResolveOptions, callback: ResolveCallback }[]} resolve
 * @property {{ options: OnLoadOptions, callback: LoadCallback }[]} load
 * @property {{ options: OnTransformOptions, callback: TransformCallback }[]} transform
 * @property {Map<string, { outputFile: string; result: import('./createResult.js').BuildResult}> } chunks
 * @property {Map<string, { outputFile: string; result: import('./createResult.js').BuildResult}> } files
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
 * @type {WeakMap<import('esbuild').BuildOptions, BuildCallbacks>}
 */
const buildInternals = new WeakMap();

/**
 * @param {import('esbuild').PluginBuild} build
 * @param {typeof import('esbuild')} [esbuildModule]
 */
export function useRna(build, esbuildModule) {
    const onResolve = build.onResolve;
    const onLoad = build.onLoad;
    /**
     * @type {BuildCallbacks}
     */
    const callbacks = buildInternals.get(build.initialOptions) || {
        resolve: [],
        load: [],
        transform: [],
        chunks: new Map(),
        files: new Map(),
    };
    buildInternals.set(build.initialOptions, callbacks);

    const rnaBuild = {
        chunks: callbacks.chunks,
        files: callbacks.files,
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
                return 'document.currentScript && document.currentScript.src || document.baseURI';
            }

            if (platform === 'node' && format !== 'esm') {
                return '\'file://\' + __filename';
            }

            return 'import.meta.url';
        },
        /**
         * Programmatically emit file reference.
         * @param {string} source The path of the file.
         * @param {string|Buffer} [buffer]
         */
        async emitFile(source, buffer) {
            const rootDir = getRootDir(build);
            const outDir = getOutputDir(build);
            const { assetNames = '[name]' } = build.initialOptions;

            const ext = path.extname(source);
            const basename = path.basename(source, ext);

            buffer = buffer || await readFile(source);

            const computedName = assetNames
                .replace('[name]', basename)
                .replace('[hash]', () => {
                    const hash = crypto.createHash('sha1');
                    hash.update(/** @type {Buffer} */ (buffer));
                    return hash.digest('hex').substr(0, 8);
                });

            const outputFile = path.join(outDir, `${computedName}${ext}`);
            const bytes = buffer.length;
            await mkdir(path.dirname(outputFile), {
                recursive: true,
            });
            await writeFile(outputFile, buffer);

            rnaBuild.files.set(source, {
                outputFile,
                result: createResult(
                    {
                        inputs: {
                            [path.relative(rootDir, source)]: {
                                bytes,
                                imports: [],
                            },
                        },
                        outputs: {
                            [path.relative(rootDir, outputFile)]: {
                                bytes,
                                inputs: {
                                    [path.relative(rootDir, source)]: {
                                        bytesInOutput: bytes,
                                    },
                                },
                                imports: [],
                                exports: [],
                                entryPoint: path.relative(rootDir, source),
                            },
                        },
                    }
                ),
            });

            return appendSearchParam(`./${path.relative(outDir, outputFile)}`, 'emit', 'file');
        },
        /**
         * Programmatically emit a chunk reference.
         * @param {string} source The path of the chunk.
         * @param {EmitTransformOptions} options Esbuild transform options.
         */
        async emitChunk(source, options = {}) {
            esbuildModule = esbuildModule || await import('esbuild');

            const rootDir = getRootDir(build);
            const outDir = getOutputDir(build);

            /** @type {import('esbuild').BuildOptions} */
            const config = {
                ...build.initialOptions,
                ...options,
                globalName: undefined,
                entryPoints: [source],
                outfile: undefined,
                metafile: true,
            };

            const { chunkNames = '[name]' } = config;
            const chunksDir = path.dirname(path.join(outDir, chunkNames));
            config.outdir = chunksDir;

            if (config.define) {
                delete config.define['this'];
            }

            const result = /** @type { BuildResult} */ (await esbuildModule.build(config));
            const outputFiles = getOutputFiles([source], result.metafile, rootDir);
            const outputFile = path.resolve(rootDir, outputFiles[0]);

            callbacks.chunks.set(source, {
                outputFile,
                result,
            });

            return appendSearchParam(`./${path.relative(outDir, outputFile)}`, 'emit', 'chunk');
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
            onLoad.call(build, options, async (args) => {
                const result = await callback(args);
                if (!result) {
                    return;
                }

                return transform(build, {
                    ...args,
                    ...result,
                    code: result.contents,
                });
            });
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
            return result;
        }
    }

    const result = build.initialOptions.platform === 'browser' ?
        await browserResolve(args.path, args.importer) :
        await nodeResolve(args.path, args.importer);

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
    const stdin = getStdinInput(build);
    const { namespace = 'file', path } = args;
    if (!callbacks) {
        const contents = (stdin && args.path === stdin.path && stdin.contents) || await readFile(args.path);
        return {
            contents,
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

    const contents = (stdin && args.path === stdin.path && stdin.contents) || await readFile(args.path);
    return {
        contents,
    };
}

const cache = [];

/**
 * @param {import('esbuild').PluginBuild} build
 * @param {OnTransformArgs} args
 * @return {Promise<OnLoadResult>}
 */
export async function transform(build, args) {
    const loaders = build.initialOptions.loader || {};
    const callbacks = buildInternals.get(build.initialOptions);
    const loader = args.loader || loaders[path.extname(args.path)] || 'file';

    let { code, resolveDir } = /** @type {{ code: string|Uint8Array; resolveDir?: string }} */ (args.code ?
        args :
        await Promise.resolve()
            .then(() => load(build, args))
            .then(({ contents, resolveDir }) => ({
                code: contents,
                resolveDir,
            })));

    if (!callbacks) {
        return {
            contents: code,
            loader,
            resolveDir,
        };
    }

    const { namespace = 'file', path: filePath } = args;
    const { transform } = callbacks;

    cache.push(filePath);
    const maps = [];
    for (const { options, callback } of transform) {
        const { namespace: optionsNamespace = 'file', filter } = options;
        if (namespace !== optionsNamespace) {
            continue;
        }

        if (!(/** @type {RegExp} */ (filter)).test(filePath)) {
            continue;
        }

        const result = await callback({
            ...args,
            code,
            loader,
        });
        if (result) {
            code = result.code;
            if (result.map) {
                maps.push(result.map);
            }
            if (result.resolveDir) {
                resolveDir = result.resolveDir;
            }
        }
    }

    if (code === args.code) {
        return {
            contents: code,
            loader,
            resolveDir,
        };
    }

    if (maps.length) {
        const inputSourcemap = await loadSourcemap(code.toString(), filePath);
        if (inputSourcemap) {
            maps.unshift(inputSourcemap);
        }
    }

    const sourceMap = maps.length > 1 ? await mergeSourcemaps(maps) : maps[0];

    return {
        contents: sourceMap ? inlineSourcemap(code.toString(), sourceMap) : code,
        loader,
        resolveDir,
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
            const { onResolve, onLoad, chunks, files } = useRna(build, esbuild);

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

            build.onEnd((buildResult) => {
                chunks.forEach(({ result }) => assignToResult(buildResult, result));
                files.forEach(({ result }) => assignToResult(buildResult, result));
            });
        },
    };

    return plugin;
}
