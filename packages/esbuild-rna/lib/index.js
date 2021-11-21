import path from 'path';
import crypto from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { appendSearchParam, browserResolve, escapeRegexBody, resolve as nodeResolve } from '@chialab/node-resolve';
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
 * @typedef {(args: import('esbuild').OnLoadArgs & { code: string | Uint8Array, loader: import('esbuild').Loader, resolveDir?: string }) => OnTransformResult | Promise<OnTransformResult | null | undefined> | null | undefined} TransformCallback
 */

/**
 * @typedef {import('./helpers.js').BuildResult & { path: string }} Chunk
 */

/**
 * @typedef {{ [key: string]: string[] }} DependenciesMap
 */

/**
 * @typedef {Object} BuildState
 * @property {{ options: OnResolveOptions, callback: ResolveCallback }[]} resolve
 * @property {{ options: OnLoadOptions, callback: LoadCallback }[]} load
 * @property {{ options: OnTransformOptions, callback: TransformCallback }[]} transform
 * @property {Map<string, Chunk>} chunks
 * @property {Map<string, Chunk>} files
 * @property {DependenciesMap} dependencies
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
 * @property {string[]} [inject]
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
 * @param {typeof import('esbuild')} [esbuildModule] The esbuild module to use for internal builds.
 */
export function useRna(build, esbuildModule) {
    const { sourceRoot, absWorkingDir, outdir, outfile, loader = {}, write = true } = build.initialOptions;
    const loaders = {
        ...DEFAULT_LOADERS,
        ...loader,
    };
    const onResolve = build.onResolve;
    const onLoad = build.onLoad;
    /**
     * @type {BuildState}
     */
    const state = buildInternals.get(build.initialOptions) || {
        resolve: [],
        load: [],
        transform: [],
        chunks: new Map(),
        files: new Map(),
        dependencies: {},
    };
    buildInternals.set(build.initialOptions, state);

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
         * Iterate build.onResult hooks in order to programmatically resolve an import.
         * @param {OnResolveArgs} args The resolve arguments.
         * @return {Promise<OnResolveResult>} A resolve result.
         */
        async resolve(args) {
            const { namespace = 'file', path } = args;
            for (const { options, callback } of state.resolve) {
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
        },
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
                [
                    createOutputFile(outputFile, /** @type {Buffer} */ (buffer)),
                ],
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
            esbuildModule = esbuildModule || await import('esbuild');

            /** @type {import('esbuild').BuildOptions} */
            const config = {
                ...build.initialOptions,
                outdir: options.outdir ? path.resolve(fullOutDir, `./${options.outdir}`) : fullOutDir,
                bundle: options.bundle ?? build.initialOptions.bundle,
                splitting: options.splitting ?? build.initialOptions.splitting,
                platform: options.platform ?? build.initialOptions.platform,
                target: options.target ?? build.initialOptions.target,
                format: options.format ?? build.initialOptions.format,
                plugins: options.plugins ?? build.initialOptions.plugins,
                write,
                globalName: undefined,
                outfile: undefined,
                metafile: true,
            };

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

            const entryPoints = [options.entryPoint];
            const result = /** @type {import('./helpers.js').BuildResult} */ (await esbuildModule.build(config));
            const resolvedEntryPoints = entryPoints.map((entryPoint) => path.resolve(rootDir, entryPoint));
            const outputs = result.metafile.outputs;
            const outFile = Object.entries(outputs)
                .filter(([output]) => !output.endsWith('.map'))
                .filter(([output]) => outputs[output].entryPoint)
                .find(([, { entryPoint }]) =>
                    resolvedEntryPoints.includes(path.resolve(workingDir, /** @type {string} */ (entryPoint)))
                );

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
         * Wrap esbuild onResolve hook in order to collect the resolve rule.
         * @param {OnResolveOptions} options The filter for onResolve hook.
         * @param {ResolveCallback} callback The function to invoke for resolution.
         */
        onResolve(options, callback) {
            onResolve.call(build, options, callback);
            state.resolve.push({ options, callback });
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
        /**
         * Iterate a build result and collect dependencies.
         * @param {import('esbuild').BuildResult} result The build result.
         * @return {DependenciesMap} The updated dependencies map.
         */
        mergeDependencies(result) {
            const map = state.dependencies;
            const { metafile } = result;
            if (!metafile) {
                return map;
            }
            for (const out of Object.values(metafile.outputs)) {
                if (!out.entryPoint) {
                    continue;
                }

                const entryPoint = path.resolve(rootDir, out.entryPoint);
                const list = map[entryPoint] = map[entryPoint] || [];
                list.push(...Object.keys(out.inputs).map((file) => path.resolve(rootDir, file)));
            }

            return map;
        },
    };

    const installedPlugins = build.initialOptions.plugins = build.initialOptions.plugins || [];
    if (!installedPlugins.find((p) => p.name === 'rna')) {
        const plugin = rnaPlugin();
        installedPlugins.unshift(plugin);
        plugin.setup(build);
    }

    return rnaBuild;
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
            /**
             * @type {import('esbuild').PartialMessage[]}
             */
            const warnings = [];
            const { stdin } = build.initialOptions;
            build.initialOptions.metafile = true;

            const { onResolve, onLoad, chunks, files, rootDir, loaders } = useRna(build, esbuild);

            build.onResolve = onResolve;
            build.onLoad = onLoad;

            if (warn) {
                const plugins = build.initialOptions.plugins || [];
                const first = plugins[0];
                if (first && first.name !== 'rna') {
                    warnings.push({
                        pluginName: 'rna',
                        text: 'The "rna" plugin should be the first of the plugins list.',
                    });
                }
            }

            if (stdin && stdin.sourcefile) {
                const sourceFile = path.resolve(rootDir, stdin.sourcefile);
                build.initialOptions.entryPoints = [sourceFile];
                delete build.initialOptions.stdin;

                onResolve({ filter: new RegExp(escapeRegexBody(sourceFile)) }, (args) => ({
                    path: args.path,
                }));

                onLoad({ filter: new RegExp(escapeRegexBody(sourceFile)) }, () => ({
                    contents: stdin.contents,
                    loader: stdin.loader || loaders[path.extname(sourceFile)] || 'file',
                }));
            }

            build.onStart(() => ({
                warnings,
            }));

            build.onEnd((buildResult) => {
                chunks.forEach((result) => assignToResult(buildResult, result));
                files.forEach((result) => assignToResult(buildResult, result));
            });
        },
    };

    return plugin;
}
