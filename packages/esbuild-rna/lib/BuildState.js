/**
 * @typedef {import('esbuild').Loader} Loader
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
 * Create a build state.
 * @returns {BuildState}
 */
export function createBuildState() {
    return {
        load: [],
        transform: [],
        chunks: new Map(),
        files: new Map(),
        builds: new Set(),
        dependencies: {},
        initialized: false,
    };
}
