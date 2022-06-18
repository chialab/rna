import path from 'path';
import crypto from 'crypto';

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
    static RESOLVED_AS_FILE = 1;
    static RESOLVED_AS_MODULE = 2;

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
     * Compute the working dir of the build.
     * @returns {string} The working dir.
     */
    getWorkingDir() {
        return this.getOptions().absWorkingDir || process.cwd();
    }

    /**
     * Compute the source root of the build.
     * @returns {string} The source root.
     */
    getSourceRoot() {
        return this.getOptions().sourceRoot || this.getWorkingDir();
    }

    /**
     * Compute the output base dir of the build.
     * @returns {string} The output base dir.
     */
    getOutBase() {
        const options = this.getOptions();
        if (options.outbase) {
            return options.outbase;
        }

        const workingDir = this.getWorkingDir();
        const entryPoints = options.entryPoints || [];
        if (!entryPoints.length) {
            return workingDir;
        }

        const separator = /\/+|\\+/;

        return (Array.isArray(entryPoints) ? entryPoints : Object.values(entryPoints))
            .map((entry) => (path.isAbsolute(entry) ? entry : path.resolve(workingDir, entry)))
            .map((entry) => path.dirname(entry))
            .map((entry) => entry.split(separator))
            .reduce((result, chunk) => {
                const len = Math.min(chunk.length, result.length);
                for (let i = 0; i < len; i++) {
                    if (chunk[i] !== result[i]) {
                        return result.splice(0, i);
                    }
                }
                return result.splice(0, len);
            })
            .join(path.sep) || path.sep;
    }

    /**
     * Compute the output dir of the build.
     * @returns {string|undefined} The output dir.
     */
    getOutDir() {
        const options = this.getOptions();
        if (options.outdir) {
            return options.outdir;
        }
        if (options.outfile) {
            return path.dirname(options.outfile);
        }
    }

    /**
     * Compute the full output dir of the build.
     * @returns {string|undefined} The full output dir.
     */
    getFullOutDir() {
        const outDir = this.getOutDir();
        if (outDir) {
            return path.resolve(this.getWorkingDir(), outDir);
        }
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
     * Get the defined loader for given file path.
     * @param {string} filePath
     * @returns {Loader|null} The loader name.
     */
    getLoader(filePath) {
        return this.getLoaders()[path.extname(filePath)] || null;
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

    /**
     * Resolve a module trying to load it as local file first.
     * EcmaScript specs requires every import specifier to use relative paths.
     * Many bundlers, like esbuild, supports also module resolution when the specifier is not a relative path.
     * Esbuild resolve method looks for a file module if the path starts with `./` or `../`,
     * fallbacking to module resolution if not.
     * But urls are allowed to to specify path name without relative paths (eg new URL('file.png', import.meta.url)).
     * Since RNA aims to support those kind of file reference,
     * using the `resolveLocallyFirst` method it is possible to load loca file module if they exists,
     * fallbacking to esbuild default module resolution if not.
     * @param {string} path
     * @param {ResolveOptions} [options]
     * @returns Resolved path.
     */
    async resolveLocallyFirst(path, options) {
        const isLocalSpecifier = path.startsWith('./') || path.startsWith('../');
        if (!isLocalSpecifier) {
            // force local file resolution first
            const result = await this.resolve(`./${path}`, options);

            if (result.path) {
                return {
                    ...result,
                    pluginData: Build.RESOLVED_AS_FILE,
                };
            }
        }

        const result = await this.resolve(path, options);
        if (result.path) {
            return {
                ...result,
                pluginData: isLocalSpecifier ? Build.RESOLVED_AS_FILE : Build.RESOLVED_AS_MODULE,
            };
        }

        return result;
    }

    /**
     * Create an hash for the given buffer.
     * @param {Buffer|Uint8Array|string} buffer The buffer input.
     * @returns A buffer hash.
     */
    hash(buffer) {
        const hash = crypto.createHash('sha1');
        hash.update(Buffer.from(buffer));
        return hash.digest('hex').substring(0, 8);
    }

    /**
     * Create file path replacing esbuild patterns.
     * @see https://esbuild.github.io/api/#chunk-names
     * @param {string} pattern The esbuild pattern.
     * @param {string} filePath The full file path.
     * @param {Buffer|string} buffer The file contents.
     * @returns {string}
     */
    computeName(pattern, filePath, buffer) {
        const outBase = this.getOutBase();
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
            .replace('[hash]', () => this.hash(buffer))
        }${path.extname(inputFile)}`;
    }
}
