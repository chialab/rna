import path from 'path';
import crypto from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { loadSourcemap, inlineSourcemap, mergeSourcemaps } from '@chialab/estransform';
import { escapeRegexBody } from '@chialab/node-resolve';
import { createOutputFile, createResult, assignToResult } from './helpers.js';

/**
 * @typedef {import('esbuild').Message} Message
 */

/**
 * @typedef {import('esbuild').Loader} Loader
 */

/**
 * @typedef {import('esbuild').Platform} Platform
 */

/**
 * @typedef {import('esbuild').Format} Format
 */

/**
 * @typedef {import('esbuild').Plugin} Plugin
 */

/**
 * @typedef {import('esbuild').PluginBuild} PluginBuild
 */

/**
 * @typedef {import('esbuild').BuildOptions} BuildOptions
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
 * @typedef {Object} VirtualEntry
 * @property {string} path
 * @property {string|Buffer} contents
 * @property {Loader} [loader]
 * @property {string} [resolveDir]
 */

/**
 * @typedef {Object} EmitTransformOptions
 * @property {Loader} [loader]
 * @property {string} [outdir]
 * @property {boolean} [bundle]
 * @property {boolean} [splitting]
 * @property {Platform} [platform]
 * @property {string} [target]
 * @property {Format} [format]
 * @property {Plugin[]} [plugins]
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
 * @typedef {Result & { id: string; path: string }} File
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
 * @typedef {OnLoadArgs & { code?: string | Uint8Array, loader?: Loader, resolveDir?: string }} OnTransformArgs
 */

/**
 * @typedef {Object} OnTransformResult
 * @property {string} [code]
 * @property {import('@chialab/estransform').SourceMap|null} [map]
 * @property {string} [resolveDir]
 * @property {Message[]} [errors]
 * @property {Message[]} [warnings]
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
 * Esbuild build handler.
 */
export class Build {
    static RESOLVED_AS_FILE = 1;
    static RESOLVED_AS_MODULE = 2;
    static ENTRY = 1;
    static CHUNK = 2;
    static ASSET = 3;

    /**
     * The current plugin name.
     * @type {string}
     */
    pluginName = '';

    /**
     * Manager instance.
     * @type {import('./BuildManager.js').BuildManager}
     * @readonly
     * @private
     */
    manager;

    /**
     * Esbuild plugin build.
     * @type {PluginBuild}
     * @readonly
     * @private
     */
    pluginBuild;

    /**
     * OnLoad rules.
     * @type {OnLoadRule[]}
     * @readonly
     * @private
     */
    onLoadRules = [];

    /**
     * OnTransform rules.
     * @type {OnTransformRule[]}
     * @readonly
     * @private
     */
    onTransformRules = [];

    /**
     * Build chunks.
     * @type {Map<string, Chunk>}
     * @readonly
     * @private
     */
    chunks = new Map();

    /**
     * Build files.
     * @type {Map<string, File>}
     * @readonly
     * @private
     */
    files = new Map();

    /**
     * Build sub-builds.
     * @type {Set<Result>}
     * @readonly
     * @private
     */
    builds = new Set();

    /**
     * Build dependencies map.
     * @type {DependenciesMap}
     * @readonly
     * @private
     */
    dependencies = {};

    /**
     * Create a build instance and state.
     * @param {PluginBuild} build
     * @param {import('./BuildManager.js').BuildManager} manager
     */
    constructor(build, manager) {
        build.initialOptions.metafile = true;
        this.manager = manager;
        this.pluginBuild = build;

        this.onStart(() => {
            const entryPoints = this.getOption('entryPoints');
            if (!entryPoints) {
                return;
            }

            if (Array.isArray(entryPoints)) {
                entryPoints.forEach((entryPoint) => {
                    entryPoint = this.resolvePath(entryPoint);
                    this.collectDependencies(entryPoint, [entryPoint]);
                });
            } else {
                for (let [, entryPoint] of Object.entries(entryPoints)) {
                    entryPoint = this.resolvePath(entryPoint);
                    this.collectDependencies(entryPoint, [entryPoint]);
                }
            }
        });

        this.onEnd(async (buildResult) => {
            const rnaResult = /** @type {Result} */ (buildResult);
            rnaResult.dependencies = this.getDependencies();
            this.chunks.forEach((result) => assignToResult(rnaResult, result));
            this.files.forEach((result) => assignToResult(rnaResult, result));
            this.builds.forEach((result) => assignToResult(rnaResult, result));

            if (rnaResult.metafile) {
                const outputs = { ...rnaResult.metafile.outputs };
                for (const outputKey in outputs) {
                    const output = outputs[outputKey];
                    if (!output.entryPoint) {
                        continue;
                    }

                    const entryPoint = this.resolveSourcePath(output.entryPoint.split('?')[0]);
                    const dependencies = Object.keys(output.inputs)
                        .map((input) => this.resolveSourcePath(input.split('?')[0]));

                    this.collectDependencies(entryPoint, dependencies);
                }
            }
        });
    }

    /**
     * Get esbuild instance of the build.
     * @returns A esbuild instance.
     */
    getBuilder() {
        return this.pluginBuild.esbuild;
    }

    /**
     * Get build options.
     * @returns The options object.
     */
    getOptions() {
        return this.pluginBuild.initialOptions;
    }

    /**
     * Get build option.
     * @template {keyof BuildOptions} K Option key.
     * @param {K} key The option key to get.
     * @returns {BuildOptions[K]} The option value.
     */
    getOption(key) {
        return this.pluginBuild.initialOptions[key];
    }

    /**
     * Set build option.
     * @template {keyof BuildOptions} K Option key.
     * @param {K} key The option key to update.
     * @param {BuildOptions[K]} value The value to set.
     */
    setOption(key, value) {
        this.pluginBuild.initialOptions[key] = value;
    }

    /**
     * Delete a build option.
     * @param {keyof BuildOptions} key The option key to remove.
     */
    deleteOption(key) {
        delete this.pluginBuild.initialOptions[key];
    }

    /**
     * Compute the working dir of the build.
     * @returns {string} The working dir.
     */
    getWorkingDir() {
        return this.getOption('absWorkingDir') || process.cwd();
    }

    /**
     * Compute the source root of the build.
     * @returns {string} The source root.
     */
    getSourceRoot() {
        return this.getOption('sourceRoot') || this.getWorkingDir();
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
            .map((entry) => (path.isAbsolute(entry) ? entry : this.resolvePath(entry)))
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
            return this.resolvePath(outDir);
        }
    }

    /**
     * Get configured build loaders.
     * @returns {{ [ext: string]: Loader }}
     */
    getLoaders() {
        return {
            '.js': 'js',
            '.jsx': 'jsx',
            '.ts': 'ts',
            '.tsx': 'tsx',
            ...(this.getOption('loader') || {}),
        };
    }

    /**
     * Set a loader rule.
     * @param {string} ext The file extension.
     * @param {Loader} loader The loader name.
     */
    setLoader(ext, loader) {
        const laoders = this.getLoaders();
        laoders[ext] = loader;
        this.setOption('loader', laoders);
    }

    /**
     * Get list of build plugins.
     * @returns {Plugin[]} A list of plugin.
     */
    getPlugins() {
        return this.getOption('plugins') || [];
    }

    /**
     * Get the defined loader for given file path.
     * @param {string} filePath
     * @returns {Loader|null} The loader name.
     */
    getLoader(filePath) {
        const loaders = this.getLoaders();
        return loaders[path.extname(filePath)] || null;
    }

    /**
     * Get the list of emitted chunks.
     * @returns {Map<string, Chunk>} A list of chunks.
     */
    getChunks() {
        return new Map(this.chunks);
    }

    /**
     * Get the list of emitted files.
     * @returns {Map<string, File>} A list of files.
     */
    getFiles() {
        return new Map(this.files);
    }

    /**
     * Get the list of emitted builds.
     * @returns {Set<Result>} A list of builds.
     */
    getBuilds() {
        return new Set(this.builds);
    }

    /**
     * Get collected dependencies.
     * @returns {DependenciesMap} The dependencies map.
     */
    getDependencies() {
        return {
            ...this.dependencies,
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
        this.pluginBuild.onStart(callback);
    }

    /**
     * Register a callback for end hook of the build.
     * @param {(result: BuildResult) => void | Promise<void>} callback The callback to register.
     */
    onEnd(callback) {
        this.pluginBuild.onEnd(callback);
    }

    /**
     * Add a resolution rule for the build.
     * @param {OnResolveOptions} options Resolve options.
     * @param {(args: OnResolveArgs) => OnResolveResult | null | undefined | Promise<OnResolveResult | null | undefined>} callback The callback to register.
     */
    onResolve(options, callback) {
        this.pluginBuild.onResolve(options, callback);
    }

    /**
     * Add a load rule for the build.
     * Wrap esbuild onLoad hook in order to use it in the transform pipeline.
     * @param {OnLoadOptions} options Load options.
     * @param {(args: OnLoadArgs) => OnLoadResult | null | undefined | Promise<OnLoadResult | null | undefined>} callback The callback to register.
     */
    onLoad(options, callback) {
        this.pluginBuild.onLoad(options, async (args) => {
            const result = await callback(args);
            if (!result) {
                return;
            }

            return this.transform({
                ...args,
                ...result,
                code: result.contents,
            });
        });
        this.onLoadRules.push({ options, callback });
    }

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
            const loaders = this.getLoaders();
            const keys = Object.keys(loaders);
            const filterLoaders = options.loaders || [];
            const tsxExtensions = keys.filter((key) => filterLoaders.includes(loaders[key]));
            bodies.push(`\\.(${tsxExtensions.map((ext) => ext.replace('.', '')).join('|')})$`);
        }
        if (options.extensions) {
            bodies.push(`(${options.extensions.join('|')})$`);
        }
        const filter = options.filter = new RegExp(`(${bodies.join(')|(')})`);
        this.pluginBuild.onLoad({ filter }, (args) => this.transform(args));
        this.onTransformRules.push({ options, callback });
    }

    /**
     * Run esbuild build with given options.
     * @param {BuildOptions} options
     * @returns {Promise<Result>} Build result with manifest.
     */
    async build(options) {
        return /** @type {Result} */ (await this.getBuilder().build(options));
    }

    /**
     * Use the build system to resolve a specifier.
     * @param {string} path The path to resolve.
     * @param {ResolveOptions} [options] Resolve options.
     * @returns {Promise<ResolveResult>} The resolved module.
     */
    resolve(path, options) {
        return this.pluginBuild.resolve(path, options);
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
     * Iterate build.onLoad hooks in order to programmatically load file contents.
     * @param {OnLoadArgs} args The load arguments.
     * @returns {Promise<OnLoadResult>} A load result with file contents.
     */
    async load(args) {
        const { namespace = 'file', path: filePath } = args;

        for (const { options, callback } of this.onLoadRules) {
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

        return {
            contents: await readFile(filePath),
        };
    }

    /**
     * Load file contents and exec compatible transformation rules collected by `onTransform`.
     * @param {OnTransformArgs} args The transform arguments.
     * @returns {Promise<OnLoadResult>} A load result with transform file contents.
     */
    async transform(args) {
        const loader = args.loader || this.getLoader(args.path) || 'file';

        let { code, resolveDir } = /** @type {{ code: string|Uint8Array; resolveDir?: string }} */ (args.code ?
            args :
            await Promise.resolve()
                .then(() => this.load(args))
                .then(({ contents, resolveDir }) => ({
                    code: contents,
                    resolveDir,
                })));

        const { namespace = 'file', path: filePath } = args;
        const maps = [];

        /**
         * @type {Message[]}
         */
        const warnings = [];

        /**
         * @type {Message[]}
         */
        const errors = [];
        for (const { options, callback } of this.onTransformRules) {
            const { namespace: optionsNamespace = 'file', filter } = options;
            if (namespace !== optionsNamespace) {
                continue;
            }

            if (!(/** @type {RegExp} */ (filter)).test(filePath)) {
                continue;
            }

            try {
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
            } catch (error) {
                if (error instanceof Error) {
                    const pluginName = this.pluginName;
                    errors.push({
                        id: 'transform-error',
                        pluginName,
                        text: error.message,
                        location: null,
                        notes: [],
                        detail: error,
                    });
                } else {
                    throw error;
                }
            }

            break;
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

    /**
     * Add a virtual module to the build.
     * @param {VirtualEntry} entry The virtual module entry.
     */
    addVirtualModule(entry) {
        const resolveDir = entry.resolveDir || this.getSourceRoot();
        const virtualFilePath = path.isAbsolute(entry.path) ? entry.path : path.join(resolveDir, entry.path);
        const virtualFilter = new RegExp(escapeRegexBody(virtualFilePath));

        this.onResolve({ filter: new RegExp(`^${escapeRegexBody(entry.path)}$`) }, () => ({
            path: virtualFilePath,
            namespace: 'file',
        }));

        this.onLoad({ filter: virtualFilter }, (args) => ({
            ...args,
            contents: entry.contents,
            namespace: 'file',
            loader: entry.loader || this.getLoader(args.path) || 'file',
            resolveDir: entry.resolveDir || path.dirname(virtualFilePath),
        }));
    }

    /**
     * Resolve file path from build working dir.
     * @param {string} filePath The file path to resolve.
     * @returns {string} Resolved file path.
     */
    resolvePath(filePath) {
        return path.resolve(this.getWorkingDir(), filePath);
    }

    /**
     * Resolve file path from source root dir.
     * @param {string} filePath The file path to resolve.
     * @returns {string} Resolved file path.
     */
    resolveSourcePath(filePath) {
        return path.resolve(this.getSourceRoot(), filePath);
    }

    /**
     * Resolve file path of an output file.
     * @param {string} filePath The output file path.
     * @param {number} [type] The type of the file.
     * @returns {string} Resolved file path.
     */
    resolveOutputDir(filePath, type = Build.ENTRY) {
        const key = type === Build.ENTRY ? 'entryNames' :
            type === Build.CHUNK ? 'chunkNames' :
                'assetNames';

        return path.dirname(this.resolvePath(
            path.join(
                this.getOutDir() || '',
                this.computeName(this.getOption(key) || '[name]', filePath, '')
            )
        ));
    }

    /**
     * Resolve file path of an output file.
     * @param {string} filePath The output file path.
     * @param {Buffer} buffer The output file buffer.
     * @param {number} [type] The type of the file.
     * @returns {string} Resolved file path.
     */
    resolveOutputFile(filePath, buffer, type = Build.ENTRY) {
        const key = type === Build.ENTRY ? 'entryNames' :
            type === Build.CHUNK ? 'chunkNames' :
                'assetNames';

        return path.resolve(
            this.getWorkingDir(),
            this.getOutDir() || this.getSourceRoot(),
            this.computeName(this.getOption(key) || '[name]', filePath, buffer)
        );
    }

    /**
     * Get the output name in manifest of a file.
     * @param {string} filePath The output file path.
     * @returns {string} Relative output name.
     */
    getOutputName(filePath) {
        return path.relative(this.getWorkingDir(), filePath);
    }

    /**
     * Insert dependency plugins in the build plugins list.
     * @param {Plugin} plugin The current plugin.
     * @param {Plugin[]} plugins A list of required plugins .
     * @param {'before'|'after'} [mode] Where insert the missing plugin.
     * @returns {Promise<string[]>} The list of plugin names that had been added to the build.
     */
    async setupPlugin(plugin, plugins, mode = 'before') {
        if (this.isChunk()) {
            return [];
        }

        const initialOptions = this.getOptions();
        const installedPlugins = initialOptions.plugins = this.getPlugins();

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

            await dependency.setup(this.pluginBuild);
        }

        return pluginsToInstall;
    }

    /**
     * Add dependencies to the build.
     * @param {string} importer The importer path.
     * @param {string[]} dependencies A list of loaded dependencies.
     * @returns {DependenciesMap} The updated dependencies map.
     */
    collectDependencies(importer, dependencies) {
        const map = this.dependencies;
        map[importer] = [
            ...(map[importer] || []),
            ...dependencies,
        ];

        return map;
    }

    /**
     * Check if path has been emitted by build.
     * @param {string} id The chunk id to check.
     * @returns {boolean} True if path has been emitted by the build.
     */
    isEmittedPath(id) {
        for (const chunk of this.chunks.values()) {
            if (chunk.id === id) {
                return true;
            }
        }
        for (const file of this.files.values()) {
            if (file.id === id) {
                return true;
            }
        }
        return false;
    }

    /**
     * Programmatically emit file reference.
     * @param {string} source The path of the file.
     * @param {string|Buffer} [buffer] File contents.
     * @returns {Promise<Chunk>} The output file reference.
     */
    async emitFile(source, buffer) {
        const workingDir = this.getWorkingDir();
        const virtualOutDir = this.getFullOutDir() || this.getWorkingDir();

        if (!buffer) {
            const result = await this.load({
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

        const outputFile = this.resolveOutputFile(source, Buffer.from(buffer), Build.ASSET);
        const bytes = buffer.length;
        const write = this.getOption('write') ?? true;
        if (write) {
            await mkdir(path.dirname(outputFile), {
                recursive: true,
            });
            await writeFile(outputFile, buffer);
        }

        const outputFiles = !write ?
            [createOutputFile(outputFile, Buffer.from(buffer))] :
            undefined;

        const result = createResult(outputFiles, {
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
        });

        const id = this.hash(buffer);
        const chunkResult = {
            ...result,
            id,
            path: path.relative(virtualOutDir, outputFile),
        };
        this.files.set(source, chunkResult);

        return chunkResult;
    }

    /**
     * Programmatically emit a chunk reference.
     * @param {EmitChunkOptions} options Esbuild transform options.
     * @returns {Promise<Chunk>} The output chunk reference.
     */
    async emitChunk(options) {
        const initialOptions = this.getOptions();
        const format = options.format || this.getOption('format');
        const virtualOutDir = this.getFullOutDir() || this.getWorkingDir();

        /** @type {BuildOptions} */
        const config = {
            ...initialOptions,
            format,
            outdir: options.outdir ?
                path.resolve(virtualOutDir, `./${options.outdir}`) :
                this.getFullOutDir(),
            bundle: options.bundle ?? initialOptions.bundle,
            splitting: format === 'esm' ? (options.splitting ?? initialOptions.splitting) : false,
            platform: options.platform ?? initialOptions.platform,
            target: options.target ?? initialOptions.target,
            plugins: options.plugins ?
                [
                    ...this.getPlugins().filter((p) => p.name === 'rna'),
                    ...options.plugins,
                ] :
                this.getPlugins().filter((plugin) => plugin.name !== 'external'),
            external: options.external ?? initialOptions.external,
            jsxFactory: ('jsxFactory' in options) ? options.jsxFactory : initialOptions.jsxFactory,
            entryNames: initialOptions.chunkNames || initialOptions.entryNames,
            write: initialOptions.write ?? true,
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
                resolveDir: this.getSourceRoot(),
            };
        } else {
            config.entryPoints = [options.path];
        }

        if (config.define) {
            delete config.define['this'];
        }

        const result = await this.build(config);
        const outputs = result.metafile.outputs;
        const outFile = Object.entries(outputs)
            .filter(([output]) => !output.endsWith('.map'))
            .find(([output]) => outputs[output].entryPoint);

        if (!outFile) {
            throw new Error('Unable to locate build artifacts');
        }

        const resolvedOutputFile = this.resolveSourcePath(outFile[0]);
        const buffer = result.outputFiles ? result.outputFiles[0].contents : await readFile(resolvedOutputFile);
        const id = this.hash(buffer);
        const chunkResult = {
            ...result,
            id,
            path: path.relative(virtualOutDir, resolvedOutputFile),
        };
        this.chunks.set(options.path, chunkResult);

        return chunkResult;
    }

    /**
     * Programmatically emit a sub build.
     * @param {EmitBuildOptions} options Esbuild build options.
     * @returns {Promise<Result>} The output build reference.
     */
    async emitBuild(options) {
        const manager = this.manager;
        const initialOptions = this.getOptions();
        const format = options.format || this.getOption('format');
        const entryPoints = options.entryPoints;

        /** @type {BuildOptions} */
        const config = {
            ...this.getOptions(),
            entryPoints: entryPoints.map((entryPoint) => {
                if (typeof entryPoint === 'string') {
                    return entryPoint;
                }

                return entryPoint.path;
            }),
            format,
            outdir: options.outdir ? this.resolvePath(options.outdir) : this.getFullOutDir(),
            bundle: options.bundle ?? initialOptions.bundle,
            splitting: format === 'esm' ? (options.splitting ?? initialOptions.splitting ?? true) : false,
            platform: options.platform ?? initialOptions.platform,
            target: options.target ?? initialOptions.target,
            plugins: options.plugins ?? initialOptions.plugins,
            external: options.external ?? initialOptions.external,
            jsxFactory: ('jsxFactory' in options) ? options.jsxFactory : initialOptions.jsxFactory,
            entryNames: initialOptions.chunkNames || initialOptions.entryNames,
            write: initialOptions.write ?? true,
            globalName: undefined,
            outfile: undefined,
            metafile: true,
        };

        const plugins = config.plugins || [];
        plugins.unshift({
            name: 'emit-virtual-modules',
            async setup(pluginBuild) {
                const build = manager.getBuild(pluginBuild);

                entryPoints.forEach((entryPoint) => {
                    if (typeof entryPoint !== 'object') {
                        return;
                    }
                    if (entryPoint.contents) {
                        build.addVirtualModule(entryPoint);
                    }
                });
            },
        });

        const result = await this.build(config);
        this.builds.add(result);

        return result;
    }
}
