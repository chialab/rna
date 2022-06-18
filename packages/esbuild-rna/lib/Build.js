import { createBuildState } from './BuildState.js';

/**
 * Esbuild build handler.
 */
export class Build {
    /**
     * Create a build instance and state.
     * @param {import('esbuild').PluginBuild} build
     */
    constructor(build) {
        build.initialOptions.metafile = true;

        this.build = build;
        this.state = createBuildState();
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
     * @param {() => (import('esbuild').OnStartResult | null | void | Promise<import('esbuild').OnStartResult | null | void>)} callback The callback to register.
     */
    onStart(callback) {
        this.build.onStart(callback);
    }

    /**
     * Register a callback for end hook of the build.
     * @param {(result: import('esbuild').BuildResult) => void | Promise<void>} callback The callback to register.
     */
    onEnd(callback) {
        this.build.onEnd(callback);
    }

    /**
     * Add a resolution rule for the build.
     * @param {import('esbuild').OnResolveOptions} options Resolve options.
     * @param {(args: import('esbuild').OnResolveArgs) => import('esbuild').OnResolveResult | null | undefined | Promise<import('esbuild').OnResolveResult | null | undefined>} callback The callback to register.
     */
    onResolve(options, callback) {
        this.build.onResolve(options, callback);
    }

    /**
     * Add a load rule for the build.
     * @param {import('esbuild').OnLoadOptions} options Load options.
     * @param {(args: import('esbuild').OnLoadArgs) => import('esbuild').OnLoadResult | null | undefined | Promise<import('esbuild').OnLoadResult | null | undefined>} callback The callback to register.
     */
    onLoad(options, callback) {
        this.build.onLoad(options, callback);
    }

    /**
     * Use the build system to resolve a specifier.
     * @param {string} path The path to resolve.
     * @param {import('esbuild').ResolveOptions} [options] Resolve options.
     * @returns {Promise<import('esbuild').ResolveResult>} The resolved module.
     */
    resolve(path, options) {
        return this.build.resolve(path, options);
    }
}
