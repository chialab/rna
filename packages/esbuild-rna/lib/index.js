import path from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { escapeRegexBody } from '@chialab/node-resolve';
import { loadSourcemap, inlineSourcemap, mergeSourcemaps } from '@chialab/estransform';
import { assignToResult, createOutputFile, createResult, getOutBase, createHash } from './helpers.js';
import { BuildManager } from './BuildManager.js';

export * from './helpers.js';

/**
 * @typedef {import('esbuild').OnResolveOptions} OnResolveOptions
 */

/**
 * @typedef {import('esbuild').ResolveOptions} ResolveOptions
 */

/**
 * @typedef {import('esbuild').OnResolveArgs} OnResolveArgs
 */

/**
 * @typedef {import('esbuild').OnResolveResult} OnResolveResult
 */

/**
 * @typedef {import('esbuild').Metafile} Metafile
 */

/**
 * @typedef {(args: OnResolveArgs) => Promise<OnResolveResult | null | undefined> | OnResolveResult | null | undefined} ResolveCallback
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
 * @typedef {import('./BuildState.js').LoadCallback} LoadCallback
 */

/**
 * @typedef {import('./BuildState.js').OnTransformArgs} OnTransformArgs
 */

/**
 * @typedef {import('./BuildState.js').OnTransformOptions} OnTransformOptions
 */

/**
 * @typedef {import('./BuildState.js').OnTransformResult} OnTransformResult
 */

/**
 * @typedef {import('./BuildState.js').TransformCallback} TransformCallback
 */

/**
 * @typedef {import('./BuildState.js').Result} Result
 */

/**
 * @typedef {import('./BuildState.js').Chunk} Chunk
 */

/**
 * @typedef {import('./BuildState.js').DependenciesMap} DependenciesMap
 */

/**
 * @typedef {Object} VirtualEntry
 * @property {string} path
 * @property {string|Buffer} contents
 * @property {import('esbuild').Loader} [loader]
 * @property {string} [resolveDir]
 */

/**
 * @typedef {import('./BuildState.js').BuildState} BuildState
 */

/**
 * @typedef {Object} EmitTransformOptions
 * @property {import('esbuild').Loader} [loader]
 * @property {string} [outdir]
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
 * @typedef {EmitTransformOptions & { path: string; contents?: string|Buffer }} EmitChunkOptions
 */

/**
 * @typedef {EmitTransformOptions & { entryPoints: (string|VirtualEntry)[] }} EmitBuildOptions
 */

/**
 * Build manager instance.
 */
const manager = new BuildManager();

/**
 * Enrich the esbuild build with a transformation pipeline and emit methods.
 * @param {import('esbuild').PluginBuild} pluginBuild The esbuild build.
 */
export function useRna(pluginBuild) {
    const build = manager.getBuild(pluginBuild);
    const esbuild = build.getBuilder();
    const {
        stdin,
        sourceRoot,
        absWorkingDir,
        outdir,
        outfile,
        outbase,
        entryPoints = [],
        write = true,
    } = build.getOptions();
    const loaders = build.getLoaders();
    const workingDir = absWorkingDir || process.cwd();
    const rootDir = sourceRoot || workingDir;
    const outDir = outdir || (outfile && path.dirname(outfile));
    const fullOutDir = outDir && path.resolve(workingDir, outDir);
    const virtualOutDir = fullOutDir || workingDir;
    const outBase = outbase || getOutBase(entryPoints, workingDir);

    const rnaBuild = {
        /**
         * A map of emitted chunks.
         */
        get chunks() {
            return build.state.chunks;
        },
        /**
         * A map of emitted files.
         */
        get files() {
            return build.state.files;
        },
        /**
         * A map of emitted builds.
         */
        get builds() {
            return build.state.builds;
        },
        /**
         * A list of collected dependencies.
         */
        get dependencies() {
            return build.state.dependencies;
        },
        /**
         * Compute the working dir.
         */
        workingDir,
        /**
         * Compute the outbase dir.
         */
        outBase,
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
        get isChunk() {
            return build.isChunk();
        },
        /**
         * Create file path replacing esbuild patterns.
         * @see https://esbuild.github.io/api/#chunk-names
         * @param {string} pattern The esbuild pattern.
         * @param {string} filePath The full file path.
         * @param {Buffer|string} buffer The file contents.
         * @returns {string}
         */
        computeName(pattern, filePath, buffer) {
            const inputFile = path.basename(filePath);

            return `${pattern
                .replace('[name]', () => path.basename(inputFile, path.extname(inputFile)))
                .replace('[ext]', () => path.extname(inputFile))
                .replace(/(\/)?\[dir\](\/)?/, (fullMatch, match1, match2) => {
                    const dir = path.relative(outBase, path.dirname(filePath));
                    if (dir) {
                        return `${match1 || ''}${dir}${match2 || ''}`;
                    }
                    if (!match1 && match2) {
                        return '';
                    }
                    return match1 || '';
                })
                .replace('[dir]', () => path.relative(outBase, path.dirname(filePath)))
                .replace('[hash]', () => createHash(/** @type {Buffer} */(buffer)))
            }${path.extname(inputFile)}`;
        },
        /**
         * Resolve a module trying to load it as local file first.
         * @param {string} path
         * @param {ResolveOptions} [options]
         * @returns Resolved path.
         */
        async resolveLocallyFirst(path, options) {
            const isLocalSpecifier = path.startsWith('./') || path.startsWith('../');
            if (!isLocalSpecifier) {
                // force local file resolution first
                const result = await build.resolve(`./${path}`, options);

                if (result.path) {
                    return {
                        ...result,
                        pluginData: true,
                    };
                }
            }

            const result = await build.resolve(path, options);
            if (result.path) {
                return {
                    ...result,
                    pluginData: isLocalSpecifier,
                };
            }

            return result;
        },
        /**
         * Iterate build.onLoad hooks in order to programmatically load file contents.
         * @param {OnLoadArgs} args The load arguments.
         * @returns {Promise<OnLoadResult>} A load result with file contents.
         */
        async load(args) {
            const { namespace = 'file', path: filePath } = args;

            for (const { options, callback } of build.state.load) {
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
            const maps = [];
            const warnings = [];
            const errors = [];
            for (const { options, callback } of build.state.transform) {
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
                    if (result.code) {
                        code = result.code;
                    }
                    if (result.warnings) {
                        warnings.push(...result.warnings);
                    }
                    if (result.errors) {
                        errors.push(...result.errors);
                    }
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
                    warnings,
                    errors,
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
                warnings,
                errors,
            };
        },
        /**
         * Check if path has been emitted by build.
         * @param {string} id The chunk id.
         */
        isEmittedPath(id) {
            for (const chunk of build.state.chunks.values()) {
                if (chunk.id === id) {
                    return true;
                }
            }
            for (const file of build.state.files.values()) {
                if (file.id === id) {
                    return true;
                }
            }
            return false;
        },
        /**
         * Programmatically emit file reference.
         * @param {string} source The path of the file.
         * @param {string|Buffer} [buffer] File contents.
         * @returns {Promise<Chunk>} The output file reference.
         */
        async emitFile(source, buffer) {
            const { assetNames = '[name]' } = build.getOptions();

            if (!buffer) {
                const result = await rnaBuild.load({
                    pluginData: null,
                    namespace: 'file',
                    suffix: '',
                    path: source,
                });

                if (result.contents) {
                    buffer = Buffer.from(result.contents);
                } else {
                    buffer = await readFile(source);
                }
            }

            const computedName = rnaBuild.computeName(assetNames, source, buffer);
            const outputFile = path.resolve(virtualOutDir, computedName);
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

            const id = createHash(Buffer.from(buffer));
            const chunkResult = {
                ...result,
                id,
                path: path.relative(virtualOutDir, outputFile),
            };
            rnaBuild.files.set(source, chunkResult);

            return chunkResult;
        },
        /**
         * Programmatically emit a chunk reference.
         * @param {EmitChunkOptions} options Esbuild transform options.
         * @returns {Promise<Chunk>} The output chunk reference.
         */
        async emitChunk(options) {
            const format = options.format ?? build.getOptions().format;

            /** @type {import('esbuild').BuildOptions} */
            const config = {
                ...build.getOptions(),
                format,
                outdir: options.outdir ? path.resolve(virtualOutDir, `./${options.outdir}`) : fullOutDir,
                bundle: options.bundle ?? build.getOptions().bundle,
                splitting: format === 'esm' ? (options.splitting ?? build.getOptions().splitting) : false,
                platform: options.platform ?? build.getOptions().platform,
                target: options.target ?? build.getOptions().target,
                plugins: options.plugins ?? build.getOptions().plugins,
                external: options.external ?? build.getOptions().external,
                jsxFactory: ('jsxFactory' in options) ? options.jsxFactory : build.getOptions().jsxFactory,
                entryNames: build.getOptions().chunkNames || build.getOptions().entryNames,
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
                    sourcefile: options.path,
                    contents: options.contents.toString(),
                    loader: options.loader,
                    resolveDir: rootDir,
                };
            } else {
                config.entryPoints = [options.path];
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
            const buffer = result.outputFiles ? result.outputFiles[0].contents : await readFile(resolvedOutputFile);
            const id = createHash(Buffer.from(buffer));
            const chunkResult = {
                ...result,
                id,
                path: path.relative(virtualOutDir, resolvedOutputFile),
            };
            build.state.chunks.set(options.path, chunkResult);

            return chunkResult;
        },
        /**
         * Programmatically emit a sub build.
         * @param {EmitBuildOptions} options Esbuild build options.
         * @returns {Promise<Result>} The output build reference.
         */
        async emitBuild(options) {
            const format = options.format ?? build.getOptions().format;
            const entryPoints = options.entryPoints;

            /** @type {import('esbuild').BuildOptions} */
            const config = {
                ...build.getOptions(),
                entryPoints: entryPoints.map((entryPoint) => {
                    if (typeof entryPoint === 'string') {
                        return entryPoint;
                    }

                    return entryPoint.path;
                }),
                format,
                outdir: options.outdir ? path.resolve(virtualOutDir, `./${options.outdir}`) : fullOutDir,
                bundle: options.bundle ?? build.getOptions().bundle,
                splitting: format === 'esm' ? (options.splitting ?? build.getOptions().splitting ?? true) : false,
                platform: options.platform ?? build.getOptions().platform,
                target: options.target ?? build.getOptions().target,
                plugins: options.plugins ?? build.getOptions().plugins,
                external: options.external ?? build.getOptions().external,
                jsxFactory: ('jsxFactory' in options) ? options.jsxFactory : build.getOptions().jsxFactory,
                entryNames: build.getOptions().chunkNames || build.getOptions().entryNames,
                write,
                globalName: undefined,
                outfile: undefined,
                metafile: true,
            };

            const plugins = config.plugins || [];
            plugins.unshift({
                name: 'emit-virtual-modules',
                async setup(build) {
                    const { addVirtualModule } = useRna(build);

                    entryPoints.forEach((entryPoint) => {
                        if (typeof entryPoint !== 'object') {
                            return;
                        }
                        if (entryPoint.contents) {
                            addVirtualModule(entryPoint);
                        }
                    });
                },
            });

            const result = /** @type {Result} */ (await esbuild.build(config));
            build.state.builds.add(result);

            return result;
        },
        /**
         * Wrap esbuild onLoad hook in order to collect the load callback.
         * @param {OnLoadOptions} options The filter for onLoad hook.
         * @param {LoadCallback} callback The function to invoke for loading.
         */
        onLoad(options, callback) {
            build.onLoad(options, async (args) => {
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
            build.state.load.push({ options, callback });
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
            build.onLoad.call(build, { filter }, (args) => rnaBuild.transform(args));
            build.state.transform.push({ options, callback });
        },
        /**
         * Insert dependency plugins in the build plugins list.
         * @param {import('esbuild').Plugin} plugin The current plugin.
         * @param {import('esbuild').Plugin[]} plugins A list of required plugins .
         * @param {'before'|'after'} [mode] Where insert the missing plugin.
         * @returns {Promise<string[]>} The list of plugin names that had been added to the build.
         */
        async setupPlugin(plugin, plugins, mode = 'before') {
            if (build.isChunk()) {
                return [];
            }

            const installedPlugins = build.getOptions().plugins = build.getOptions().plugins || [];

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

                await dependency.setup(build.build);
            }

            return pluginsToInstall;
        },
        /**
         * Add dependencies to the build.
         * @param {string} importer The importer path.
         * @param {string[]} dependencies A list of loaded dependencies.
         * @returns {DependenciesMap} The updated dependencies map.
         */
        collectDependencies(importer, dependencies) {
            const map = build.state.dependencies;
            map[importer] = [
                ...(map[importer] || []),
                ...dependencies,
            ];

            return map;
        },
        /**
         * Add a virtual module to the build.
         * @param {VirtualEntry} entry The virtual module entry.
         */
        addVirtualModule(entry) {
            const resolveDir = entry.resolveDir || rootDir;
            const virtualFilePath = path.isAbsolute(entry.path) ? entry.path : path.join(resolveDir, entry.path);
            const virtualFilter = new RegExp(escapeRegexBody(virtualFilePath));

            build.onResolve({ filter: new RegExp(`^${escapeRegexBody(entry.path)}$`) }, () => ({
                path: virtualFilePath,
                namespace: 'file',
            }));

            rnaBuild.onLoad({ filter: virtualFilter }, (args) => ({
                ...args,
                contents: entry.contents,
                namespace: 'file',
                loader: entry.loader || loaders[path.extname(args.path)] || 'file',
                resolveDir: entry.resolveDir || path.dirname(virtualFilePath),
            }));
        },
    };

    if (stdin && stdin.sourcefile) {
        const sourceFile = path.resolve(rootDir, stdin.sourcefile);
        build.getOptions().entryPoints = [sourceFile];
        delete build.getOptions().stdin;

        rnaBuild.addVirtualModule({
            path: sourceFile,
            contents: stdin.contents,
            loader: stdin.loader,
        });
    }

    if (!build.state.initialized) {
        build.state.initialized = true;

        build.onStart(() => {
            const entryPoints = build.getOptions().entryPoints;
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
            const rnaResult = /** @type {Result} */ (buildResult);
            rnaResult.dependencies = build.state.dependencies;
            build.state.chunks.forEach((result) => assignToResult(rnaResult, result));
            build.state.files.forEach((result) => assignToResult(rnaResult, result));
            build.state.builds.forEach((result) => assignToResult(rnaResult, result));

            if (rnaResult.metafile) {
                const outputs = { ...rnaResult.metafile.outputs };
                for (const outputKey in outputs) {
                    const output = outputs[outputKey];
                    if (!output.entryPoint) {
                        continue;
                    }

                    const entryPoint = path.resolve(rootDir, output.entryPoint.split('?')[0]);
                    const dependencies = Object.keys(output.inputs)
                        .map((input) => path.resolve(rootDir, input.split('?')[0]));

                    rnaBuild.collectDependencies(entryPoint, dependencies);
                }
            }
        });
    }

    return rnaBuild;
}

/**
* @returns {import('esbuild').Plugin}
*/
export function rnaPlugin() {
    return {
        name: 'rna',
        setup(build) {
            useRna(build);
        },
    };
}
