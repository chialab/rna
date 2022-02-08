import path from 'path';
import crypto from 'crypto';
import { mkdir, readFile, writeFile, rm } from 'fs/promises';
import { appendSearchParam, escapeRegexBody } from '@chialab/node-resolve';
import { loadSourcemap, inlineSourcemap, mergeSourcemaps } from '@chialab/estransform';
import { assignToResult, createOutputFile, createResult } from './helpers.js';

export * from './helpers.js';

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
 * @typedef {{ filter?: RegExp; loaders?: import('esbuild').Loader[]; extensions?: string[]; namespace?: string }} OnTransformOptions
 */

/**
 * @typedef {{ code: string, map?: import('@chialab/estransform').SourceMap|null, resolveDir?: string }} OnTransformResult
 */

/**
 * @typedef {(args: import('esbuild').OnLoadArgs & { code: string, loader: import('esbuild').Loader, resolveDir?: string }) => OnTransformResult | Promise<OnTransformResult | null | undefined> | null | undefined} TransformCallback
 */

/**
 * @typedef {import('esbuild').BuildResult & { metafile: Metafile; dependencies: DependenciesMap }} Result
 */

/**
 * @typedef {Result & { path: string }} Chunk
 */

/**
 * @typedef {{ [key: string]: string[] }} DependenciesMap
 */

/**
 * @typedef {Object} BuildState
 * @property {{ options: OnLoadOptions, callback: LoadCallback }[]} load
 * @property {{ options: OnTransformOptions, callback: TransformCallback }[]} transform
 * @property {Map<string, Chunk>} chunks
 * @property {Map<string, Chunk>} files
 * @property {DependenciesMap} dependencies
 * @property {boolean} initialized
 */

/**
 * @typedef {import('esbuild').Metafile} Metafile
 */

/**
 * @typedef {Object} EmitTransformOptions
 * @property {string} entryPoint
 * @property {import('esbuild').Loader} [loader]
 * @property {string} [outdir]
 * @property {string|Buffer} [contents]
 * @property {boolean} [bundle]
 * @property {boolean} [splitting]
 * @property {import('esbuild').Platform} [platform]
 * @property {string} [target]
 * @property {import('esbuild').Format} [format]
 * @property {import('esbuild').Plugin[]} [plugins]
 * @property {string[]} [external]
 * @property {string[]} [inject]
 * @property {string|undefined} [jsxFactory]
 */

/**
 * @type {WeakMap<import('esbuild').BuildOptions, BuildState>}
 */
const buildInternals = new WeakMap();

/**
 * @type {{ [ext: string]: import('esbuild').Loader }}
 */
const DEFAULT_LOADERS = { '.js': 'js', '.jsx': 'jsx', '.ts': 'ts', '.tsx': 'tsx' };

/**
 * Enrich the esbuild build with a transformation pipeline and emit methods.
 * @param {import('esbuild').PluginBuild} build The esbuild build.
 */
export function useRna(build) {
    build.initialOptions.metafile = true;

    const { esbuild } = build;
    const { stdin, sourceRoot, absWorkingDir, outdir, outfile, loader = {}, write = true } = build.initialOptions;
    const loaders = {
        ...DEFAULT_LOADERS,
        ...loader,
    };
    const onLoad = build.onLoad;
    /**
     * @type {BuildState}
     */
    const state = buildInternals.get(build.initialOptions) || {
        load: [],
        transform: [],
        chunks: new Map(),
        files: new Map(),
        dependencies: {},
        initialized: false,
    };
    buildInternals.set(build.initialOptions, state);

    const isChunk = 'chunk' in build.initialOptions;
    const workingDir = absWorkingDir || process.cwd();
    const rootDir = sourceRoot || absWorkingDir || process.cwd();
    const outDir = /** @type {string} */(outdir || (outfile && path.dirname(outfile)));
    const fullOutDir = /** @type {string} */(outDir && path.resolve(workingDir, outDir));

    const rnaBuild = {
        /**
         * A map of emitted chunks.
         */
        chunks: state.chunks,
        /**
         * A map of emitted files.
         */
        files: state.files,
        /**
         * A list of collected dependencies.
         */
        dependencies: state.dependencies,
        /**
         * Compute the working dir.
         */
        workingDir,
        /**
         * Compute the build root dir.
         */
        rootDir,
        /**
         * Compute the build output dir.
         */
        outDir,
        /**
         * Compute loaders.
         */
        loaders,
        /**
         * Flag chunk build.
         */
        isChunk,
        /**
         * Iterate build.onLoad hooks in order to programmatically load file contents.
         * @param {OnLoadArgs} args The load arguments.
         * @return {Promise<OnLoadResult>} A load result with file contents.
         */
        async load(args) {
            const { namespace = 'file', path: filePath } = args;

            const { load } = state;
            for (const { options, callback } of load) {
                const { namespace: optionsNamespace = 'file', filter } = options;
                if (namespace !== optionsNamespace) {
                    continue;
                }

                if (!filter.test(filePath)) {
                    continue;
                }

                const result = await callback(args);
                if (result) {
                    return result;
                }
            }

            const contents = await readFile(filePath);

            return {
                contents,
            };
        },
        /**
         * @param {OnTransformArgs} args
         */
        async transform(args) {
            const loader = args.loader || loaders[path.extname(args.path)] || 'file';

            let { code, resolveDir } = /** @type {{ code: string|Uint8Array; resolveDir?: string }} */ (args.code ?
                args :
                await Promise.resolve()
                    .then(() => rnaBuild.load(args))
                    .then(({ contents, resolveDir }) => ({
                        code: contents,
                        resolveDir,
                    })));

            const { namespace = 'file', path: filePath } = args;
            const { transform } = state;

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
                    code: typeof code !== 'string' ? code.toString() : code,
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
        },
        /**
         * Programmatically emit file reference.
         * @param {string} source The path of the file.
         * @param {string|Buffer} [buffer] File contents.
         * @return {Promise<Chunk>} The output file reference.
         */
        async emitFile(source, buffer) {
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

            const outputFile = path.join(fullOutDir, `${computedName}${ext}`);
            const bytes = buffer.length;
            if (write) {
                await mkdir(path.dirname(outputFile), {
                    recursive: true,
                });
                await writeFile(outputFile, buffer);
            }

            const result = createResult(
                write ? undefined : [
                    createOutputFile(outputFile, /** @type {Buffer} */ (buffer)),
                ],
                {
                    inputs: {
                        [path.relative(workingDir, source)]: {
                            bytes,
                            imports: [],
                        },
                    },
                    outputs: {
                        [path.relative(workingDir, outputFile)]: {
                            bytes,
                            inputs: {
                                [path.relative(workingDir, source)]: {
                                    bytesInOutput: bytes,
                                },
                            },
                            imports: [],
                            exports: [],
                            entryPoint: path.relative(workingDir, source),
                        },
                    },
                }
            );

            const chunkResult = {
                ...result,
                path: appendSearchParam(`./${path.relative(fullOutDir, outputFile)}`, 'emit', 'file'),
            };
            rnaBuild.files.set(source, chunkResult);

            return chunkResult;
        },
        /**
         * Programmatically emit a chunk reference.
         * @param {EmitTransformOptions} options Esbuild transform options.
         * @return {Promise<Chunk>} The output chunk reference.
         */
        async emitChunk(options) {
            const format = options.format ?? build.initialOptions.format;

            /** @type {import('esbuild').BuildOptions} */
            const config = {
                ...build.initialOptions,
                format,
                outdir: options.outdir ? path.resolve(fullOutDir, `./${options.outdir}`) : fullOutDir,
                bundle: options.bundle ?? build.initialOptions.bundle,
                splitting: format === 'esm' ? (options.splitting ?? build.initialOptions.splitting) : false,
                platform: options.platform ?? build.initialOptions.platform,
                target: options.target ?? build.initialOptions.target,
                plugins: options.plugins ?? build.initialOptions.plugins,
                external: options.external ?? build.initialOptions.external,
                jsxFactory: ('jsxFactory' in options) ? options.jsxFactory : build.initialOptions.jsxFactory,
                write,
                globalName: undefined,
                outfile: undefined,
                metafile: true,
            };

            Object.defineProperty(config, 'chunk', {
                enumerable: false,
                value: true,
            });

            if (options.contents) {
                delete config.entryPoints;
                config.stdin = {
                    sourcefile: options.entryPoint,
                    contents: options.contents.toString(),
                    loader: options.loader,
                    resolveDir: rootDir,
                };
            } else {
                config.entryPoints = [options.entryPoint];
            }

            if (config.define) {
                delete config.define['this'];
            }

            const plugins = config.plugins || [];
            if (!plugins.find((plugin) => plugin.name === 'rna')) {
                plugins.unshift(rnaPlugin());
            }
            config.plugins = plugins.filter((plugin) => plugin.name !== 'external');

            const result = /** @type {Result} */ (await esbuild.build(config));
            const outputs = result.metafile.outputs;
            const outFile = Object.entries(outputs)
                .filter(([output]) => !output.endsWith('.map'))
                .find(([output]) => outputs[output].entryPoint);

            if (!outFile) {
                throw new Error('Unable to locate build artifacts');
            }

            const resolvedOutputFile = path.resolve(rootDir, outFile[0]);
            const chunkResult = {
                ...result,
                path: appendSearchParam(`./${path.relative(fullOutDir, resolvedOutputFile)}`, 'emit', 'chunk'),
            };
            state.chunks.set(options.entryPoint, chunkResult);

            return chunkResult;
        },
        /**
         * Wrap esbuild onLoad hook in order to collect the load callback.
         * @param {OnLoadOptions} options The filter for onLoad hook.
         * @param {LoadCallback} callback The function to invoke for loading.
         */
        onLoad(options, callback) {
            onLoad.call(build, options, async (args) => {
                const result = await callback(args);
                if (!result) {
                    return;
                }

                return rnaBuild.transform({
                    ...args,
                    ...result,
                    code: result.contents,
                });
            });
            state.load.push({ options, callback });
        },
        /**
         * Add a transform hook to the build.
         * Differently from onLoad, each onTransform callback matched by the resource is invoked.
         * @param {OnTransformOptions} options The filter for onTransform hook.
         * @param {TransformCallback} callback The function to invoke for transformation.
         */
        onTransform(options, callback) {
            const bodies = [];

            if (options.filter) {
                bodies.push(options.filter.source);
            }
            if (options.loaders) {
                const keys = Object.keys(loaders);
                const filterLoaders = options.loaders || [];
                const tsxExtensions = keys.filter((key) => filterLoaders.includes(loaders[key]));
                bodies.push(`\\.(${tsxExtensions.map((ext) => ext.replace('.', '')).join('|')})$`);
            }
            if (options.extensions) {
                bodies.push(`(${options.extensions.join('|')})$`);
            }
            const filter = options.filter = new RegExp(`(${bodies.join(')|(')})`);
            onLoad.call(build, { filter }, (args) => rnaBuild.transform(args));
            state.transform.push({ options, callback });
        },
        /**
         * Insert dependency plugins in the build plugins list.
         * @param {import('esbuild').Plugin} plugin The current plugin.
         * @param {import('esbuild').Plugin[]} plugins A list of required plugins .
         * @param {'before'|'after'} [mode] Where insert the missing plugin.
         * @return {Promise<string[]>} The list of plugin names that had been added to the build.
         */
        async setupPlugin(plugin, plugins, mode = 'before') {
            if (isChunk) {
                return [];
            }

            const installedPlugins = build.initialOptions.plugins = build.initialOptions.plugins || [];

            /**
             * @type {string[]}
             */
            const pluginsToInstall = [];

            let last = plugin;
            for (let i = 0; i < plugins.length; i++) {
                const dependency = plugins[i];
                if (installedPlugins.find((p) => p.name === dependency.name)) {
                    continue;
                }

                pluginsToInstall.push(dependency.name);
                const io = installedPlugins.indexOf(last);
                installedPlugins.splice(mode === 'before' ? io : (io + 1), 0, dependency);
                if (mode === 'after') {
                    last = dependency;
                }

                await dependency.setup(build);
            }

            return pluginsToInstall;
        },
        /**
         * Add dependencies to the build.
         * @param {string} importer The importer path.
         * @param {string[]} dependencies A list of loaded dependencies.
         * @return {DependenciesMap} The updated dependencies map.
         */
        collectDependencies(importer, dependencies) {
            const map = state.dependencies;
            map[importer] = [
                ...(map[importer] || []),
                ...dependencies,
            ];

            return map;
        },
    };

    if (stdin && stdin.sourcefile) {
        const sourceFile = path.resolve(rootDir, stdin.sourcefile);
        build.initialOptions.entryPoints = [sourceFile];
        delete build.initialOptions.stdin;

        build.onResolve({ filter: new RegExp(escapeRegexBody(sourceFile)) }, (args) => ({
            path: args.path,
        }));

        rnaBuild.onLoad({ filter: new RegExp(escapeRegexBody(sourceFile)) }, () => ({
            contents: stdin.contents,
            loader: stdin.loader || loaders[path.extname(sourceFile)] || 'file',
        }));
    }

    if (!state.initialized) {
        state.initialized = true;

        build.onStart(() => {
            const entryPoints = build.initialOptions.entryPoints;
            if (!entryPoints) {
                return;
            }

            if (Array.isArray(entryPoints)) {
                entryPoints.forEach((entryPoint) => {
                    entryPoint = path.resolve(workingDir, entryPoint);
                    rnaBuild.collectDependencies(entryPoint, [entryPoint]);
                });
            } else {
                for (let [, entryPoint] of Object.entries(entryPoints)) {
                    entryPoint = path.resolve(workingDir, entryPoint);
                    rnaBuild.collectDependencies(entryPoint, [entryPoint]);
                }
            }
        });

        build.onEnd(async (buildResult) => {
            const loaders = { ...DEFAULT_LOADERS, ...(build.initialOptions.loader || {}) };
            const rnaResult = /** @type {Result} */ (buildResult);
            rnaResult.dependencies = state.dependencies;
            rnaBuild.chunks.forEach((result) => assignToResult(rnaResult, result));
            rnaBuild.files.forEach((result) => assignToResult(rnaResult, result));

            if (buildResult.outputFiles && buildResult.outputFiles.length) {
                const mainFile = buildResult.outputFiles[0].path;
                const mainExt = path.extname(mainFile);
                if (mainExt !== '.js') {
                    const jsFile = buildResult.outputFiles[1];
                    if (jsFile && jsFile.path.endsWith('.js')) {
                        let realFileName = path.join(path.dirname(jsFile.path), path.basename(jsFile.path, '.js'));
                        if (path.extname(realFileName) !== mainExt) {
                            realFileName += mainExt;
                        }
                        buildResult.outputFiles[0].path = realFileName;
                        buildResult.outputFiles.splice(1, 1);
                    }
                }
            }

            if (buildResult.metafile) {
                // remove .js outputs for non js entryPoints
                const outputs = { ...buildResult.metafile.outputs };
                for (const outputKey in outputs) {
                    const output = outputs[outputKey];
                    if (!output.entryPoint) {
                        continue;
                    }

                    const entryPoint = path.resolve(rootDir, output.entryPoint.split('?')[0]);
                    const dependencies = Object.keys(output.inputs)
                        .map((input) => path.resolve(rootDir, input.split('?')[0]));

                    rnaBuild.collectDependencies(entryPoint, dependencies);

                    if (path.extname(outputKey) === '.js') {
                        const entryLoader = loaders[path.extname(entryPoint)] || 'file';
                        if (entryLoader !== 'file' && entryLoader !== 'css') {
                            continue;
                        }
                        if (write) {
                            const fullOutputKey = path.join(workingDir, outputKey);
                            await rm(fullOutputKey);
                            try {
                                await rm(`${fullOutputKey}.map`);
                            } catch (err) {
                                //
                            }
                        }
                        delete buildResult.metafile.outputs[outputKey];
                    }
                }
            }
        });
    }

    return rnaBuild;
}

/**
* @return {import('esbuild').Plugin}
*/
export function rnaPlugin() {
    return {
        name: 'rna',
        setup(build) {
            useRna(build);
        },
    };
}
