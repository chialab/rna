/**
 * @typedef {import('esbuild').Loader} Loader
 */

/**
 * @typedef {import('esbuild').OnStartResult} OnStartResult
 */

/**
 * @typedef {import('esbuild').ResolveOptions} ResolveOptions
 */

/**
 * @typedef {import('esbuild').ResolveResult} ResolveResult
 */

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
 * @typedef {import('esbuild').OnLoadOptions} OnLoadOptions
 */

/**
 * @typedef {import('esbuild').OnLoadArgs} OnLoadArgs
 */

/**
 * @typedef {import('esbuild').OnLoadResult} OnLoadResult
 */

/**
 * @typedef {import('esbuild').BuildResult} BuildResult
 */

/**
 * @typedef {import('esbuild').Metafile} Metafile
 */

/**
 * @typedef {(args: OnLoadArgs) => Promise<OnLoadResult | null | undefined> | OnLoadResult | null | undefined} LoadCallback
 */

/**
 * @typedef {{ [key: string]: string[] }} DependenciesMap
 */

/**
 * @typedef {BuildResult & { metafile: Metafile; dependencies: DependenciesMap }} Result
 */

/**
 * @typedef {Result & { id: string; path: string }} Chunk
 */

/**
 * @typedef {Object} OnLoadRule
 * @property {OnLoadOptions} options
 * @property {LoadCallback} callback
 */

/**
 * @typedef {Object} OnTransformOptions
 * @property {RegExp} [filter]
 * @property {Loader[]} [loaders]
 * @property {string[]} [extensions]
 * @property {string} [namespace]
 */

/**
 * @typedef {import('esbuild').OnLoadArgs & { code?: string | Uint8Array, loader?: import('esbuild').Loader, resolveDir?: string }} OnTransformArgs
 */

/**
 * @typedef {Object} OnTransformResult
 * @property {string} [code]
 * @property {import('@chialab/estransform').SourceMap|null} [map]
 * @property {string} [resolveDir]
 * @property {import('esbuild').Message[]} [errors]
 * @property {import('esbuild').Message[]} [warnings]
 * @property {string[]} [watchFiles]
 */

/**
 * @typedef {(args: OnLoadArgs & { code: string, loader: Loader, resolveDir?: string }) => Promise<OnTransformResult | null | undefined | void> | OnTransformResult | null | undefined | void} TransformCallback
 */

/**
 * @typedef {Object} OnTransformRule
 * @property {OnTransformOptions} options
 * @property {TransformCallback} callback
 */

/**
 * @typedef {Object} BuildState
 * @property {OnLoadRule[]} load
 * @property {OnTransformRule[]} transform
 * @property {Map<string, Chunk>} chunks
 * @property {Map<string, Chunk>} files
 * @property {Set<Result>} builds
 * @property {DependenciesMap} dependencies
 * @property {boolean} initialized
 */

/**
 * Esbuild build handler.
 */
export class Build {
    /**
     * Build state.
     * @type {BuildState}
     * @readonly
     */
    state = {
        load: [],
        transform: [],
        chunks: new Map(),
        files: new Map(),
        builds: new Set(),
        dependencies: {},
        initialized: false,
    };

    /**
     * Create a build instance and state.
     * @param {import('esbuild').PluginBuild} build
     */
    constructor(build) {
        build.initialOptions.metafile = true;
        this.build = build;
    }

    /**
     * Get esbuild instance of the build.
     * @returns A esbuild instance.
     */
    getBuilder() {
        return this.build.esbuild;
    }

    /**
     * Get build options.
     * @returns The options object.
     */
    getOptions() {
        return this.build.initialOptions;
    }

    /**
     * Get configured build loaders.
     * @returns {{ [ext: string]: import('esbuild').Loader }}
     */
    getLoaders() {
        return {
            '.js': 'js',
            '.jsx': 'jsx',
            '.ts': 'ts',
            '.tsx': 'tsx',
            ...(this.getOptions().loader || {}),
        };
    }

    /**
     * Check if the build is a chunk of another build.
     * @returns {boolean} True if the build is a chunk.
     */
    isChunk() {
        return 'chunk' in this.getOptions();
    }

    /**
     * Register a callback for start hook of the build.
     * @param {() => (OnStartResult | null | void | Promise<OnStartResult | null | void>)} callback The callback to register.
     */
    onStart(callback) {
        this.build.onStart(callback);
    }

    /**
     * Register a callback for end hook of the build.
     * @param {(result: BuildResult) => void | Promise<void>} callback The callback to register.
     */
    onEnd(callback) {
        this.build.onEnd(callback);
    }

    /**
     * Add a resolution rule for the build.
     * @param {OnResolveOptions} options Resolve options.
     * @param {(args: OnResolveArgs) => OnResolveResult | null | undefined | Promise<OnResolveResult | null | undefined>} callback The callback to register.
     */
    onResolve(options, callback) {
        this.build.onResolve(options, callback);
    }

    /**
     * Add a load rule for the build.
     * @param {OnLoadOptions} options Load options.
     * @param {(args: OnLoadArgs) => OnLoadResult | null | undefined | Promise<OnLoadResult | null | undefined>} callback The callback to register.
     */
    onLoad(options, callback) {
        this.build.onLoad(options, callback);
    }

    /**
     * Use the build system to resolve a specifier.
     * @param {string} path The path to resolve.
     * @param {ResolveOptions} [options] Resolve options.
     * @returns {Promise<ResolveResult>} The resolved module.
     */
    resolve(path, options) {
        return this.build.resolve(path, options);
    }
}
