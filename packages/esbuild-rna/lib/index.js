import path from 'path';
import { BuildManager } from './BuildManager.js';

export * from './Build.js';
export * from './helpers.js';

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
    const rnaBuild = {
        /**
         * A map of emitted chunks.
         */
        get chunks() {
            return build.getChunks();
        },
        /**
         * A map of emitted files.
         */
        get files() {
            return build.getFiles();
        },
        /**
         * A map of emitted builds.
         */
        get builds() {
            return build.getBuilds();
        },
        /**
         * A list of collected dependencies.
         */
        get dependencies() {
            return build.getDependencies();
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
        setupPlugin: build.setupPlugin.bind(build),
        /**
         * Add dependencies to the build.
         * @param {string} importer The importer path.
         * @param {string[]} dependencies A list of loaded dependencies.
         * @returns {DependenciesMap} The updated dependencies map.
         */
        collectDependencies: build.collectDependencies.bind(build),
        /**
         * Add a virtual module to the build.
         * @param {VirtualEntry} entry The virtual module entry.
         */
        addVirtualModule: build.addVirtualModule.bind(build),
    };

    const stdin = build.getOption('stdin');
    if (stdin && stdin.sourcefile) {
        const sourceFile = path.resolve(build.getSourceRoot(), stdin.sourcefile);
        build.setOption('entryPoints', [sourceFile]);
        build.deleteOption('stdin');

        rnaBuild.addVirtualModule({
            path: sourceFile,
            contents: stdin.contents,
            loader: stdin.loader,
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
