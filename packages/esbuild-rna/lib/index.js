import path from 'path';
import { assignToResult } from './helpers.js';
import { BuildManager } from './BuildManager.js';

export * from './Build.js';
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
 * @typedef {import('./Build.js').LoadCallback} LoadCallback
 */

/**
 * @typedef {import('./Build.js').OnTransformArgs} OnTransformArgs
 */

/**
 * @typedef {import('./Build.js').OnTransformOptions} OnTransformOptions
 */

/**
 * @typedef {import('./Build.js').OnTransformResult} OnTransformResult
 */

/**
 * @typedef {import('./Build.js').TransformCallback} TransformCallback
 */

/**
 * @typedef {import('./Build.js').Result} Result
 */

/**
 * @typedef {import('./Build.js').Chunk} Chunk
 */

/**
 * @typedef {import('./Build.js').DependenciesMap} DependenciesMap
 */

/**
 * @typedef {Object} VirtualEntry
 * @property {string} path
 * @property {string|Buffer} contents
 * @property {import('esbuild').Loader} [loader]
 * @property {string} [resolveDir]
 */

/**
 * @typedef {import('./Build.js').BuildState} BuildState
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
    const { stdin } = build.getOptions();

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
        get workingDir() {
            return build.getWorkingDir();
        },
        /**
         * Compute the build root dir.
         */
        get rootDir() {
            return build.getSourceRoot();
        },
        /**
         * Compute the outbase dir.
         */
        get outBase() {
            return build.getOutBase();
        },
        /**
         * Compute the build output dir.
         */
        get outDir() {
            return build.getOutDir();
        },
        /**
         * Compute loaders.
         */
        get loaders() {
            return build.getLoaders();
        },
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
        computeName: build.computeName.bind(build),
        /**
         * Resolve a module trying to load it as local file first.
         * @param {string} path
         * @param {ResolveOptions} [options]
         * @returns Resolved path.
         */
        resolveLocallyFirst: build.resolveLocallyFirst.bind(build),
        /**
         * Iterate build.onLoad hooks in order to programmatically load file contents.
         * @param {OnLoadArgs} args The load arguments.
         * @returns {Promise<OnLoadResult>} A load result with file contents.
         */
        load: build.load.bind(build),
        /**
         * @param {OnTransformArgs} args
         */
        transform: build.transform.bind(build),
        /**
         * Check if path has been emitted by build.
         * @param {string} id The chunk id.
         */
        isEmittedPath: build.isEmittedPath.bind(build),
        /**
         * Programmatically emit file reference.
         * @param {string} source The path of the file.
         * @param {string|Buffer} [buffer] File contents.
         * @returns {Promise<Chunk>} The output file reference.
         */
        emitFile: build.emitFile.bind(build),
        /**
         * Programmatically emit a chunk reference.
         * @param {EmitChunkOptions} options Esbuild transform options.
         * @returns {Promise<Chunk>} The output chunk reference.
         */
        emitChunk: build.emitChunk.bind(build),
        /**
         * Programmatically emit a sub build.
         * @param {EmitBuildOptions} options Esbuild build options.
         * @returns {Promise<Result>} The output build reference.
         */
        emitBuild: build.emitBuild.bind(build),
        /**
         * Wrap esbuild onLoad hook in order to collect the load callback.
         * @param {OnLoadOptions} options The filter for onLoad hook.
         * @param {LoadCallback} callback The function to invoke for loading.
         */
        onLoad: build.onLoad.bind(build),
        /**
         * Add a transform hook to the build.
         * Differently from onLoad, each onTransform callback matched by the resource is invoked.
         * @param {OnTransformOptions} options The filter for onTransform hook.
         * @param {TransformCallback} callback The function to invoke for transformation.
         */
        onTransform: build.onTransform.bind(build),
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

                await dependency.setup(build.pluginBuild);
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
        addVirtualModule: build.addVirtualModule.bind(build),
    };

    if (stdin && stdin.sourcefile) {
        const sourceFile = path.resolve(build.getSourceRoot(), stdin.sourcefile);
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
                    entryPoint = path.resolve(build.getWorkingDir(), entryPoint);
                    rnaBuild.collectDependencies(entryPoint, [entryPoint]);
                });
            } else {
                for (let [, entryPoint] of Object.entries(entryPoints)) {
                    entryPoint = path.resolve(build.getWorkingDir(), entryPoint);
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

                    const entryPoint = path.resolve(build.getSourceRoot(), output.entryPoint.split('?')[0]);
                    const dependencies = Object.keys(output.inputs)
                        .map((input) => path.resolve(build.getSourceRoot(), input.split('?')[0]));

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
