import path from 'path';
import crypto from 'crypto';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { loadSourcemap, inlineSourcemap, mergeSourcemaps } from '@chialab/estransform';
import { escapeRegexBody } from '@chialab/node-resolve';
import { createOutputFile, createResult } from './helpers.js';

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
 * @typedef {Object} VirtualEntry
 * @property {string} path
 * @property {string|Buffer} contents
 * @property {import('esbuild').Loader} [loader]
 * @property {string} [resolveDir]
 */

/**
 * @typedef {Object} EmitTransformOptions
 * @property {Loader} [loader]
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
     * @param {import('./BuildManager.js').BuildManager} manager
     */
    constructor(build, manager) {
        build.initialOptions.metafile = true;
        this.manager = manager;
        this.pluginBuild = build;
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
     * Get list of build plugins.
     * @returns {import('esbuild').Plugin[]} A list of plugin.
     */
    getPlugins() {
        return this.getOptions().plugins || [];
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
        this.state.load.push({ options, callback });
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
        this.state.transform.push({ options, callback });
    }

    /**
     * Run esbuild build with given options.
     * @param {import('esbuild').BuildOptions} options
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

        for (const { options, callback } of this.state.load) {
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
        const warnings = [];
        const errors = [];
        for (const { options, callback } of this.state.transform) {
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
     * Check if path has been emitted by build.
     * @param {string} id The chunk id to check.
     * @returns {boolean} True if path has been emitted by the build.
     */
    isEmittedPath(id) {
        for (const chunk of this.state.chunks.values()) {
            if (chunk.id === id) {
                return true;
            }
        }
        for (const file of this.state.files.values()) {
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
        const { assetNames = '[name]', write = true } = this.getOptions();
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

        const computedName = this.computeName(assetNames, source, buffer);
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
                createOutputFile(outputFile, Buffer.from(buffer)),
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

        const id = this.hash(buffer);
        const chunkResult = {
            ...result,
            id,
            path: path.relative(virtualOutDir, outputFile),
        };
        this.state.files.set(source, chunkResult);

        return chunkResult;
    }

    /**
     * Programmatically emit a chunk reference.
     * @param {EmitChunkOptions} options Esbuild transform options.
     * @returns {Promise<Chunk>} The output chunk reference.
     */
    async emitChunk(options) {
        const initialOptions = this.getOptions();
        const format = options.format ?? initialOptions.format;
        const virtualOutDir = this.getFullOutDir() || this.getWorkingDir();

        /** @type {import('esbuild').BuildOptions} */
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

        const resolvedOutputFile = path.resolve(this.getSourceRoot(), outFile[0]);
        const buffer = result.outputFiles ? result.outputFiles[0].contents : await readFile(resolvedOutputFile);
        const id = this.hash(buffer);
        const chunkResult = {
            ...result,
            id,
            path: path.relative(virtualOutDir, resolvedOutputFile),
        };
        this.state.chunks.set(options.path, chunkResult);

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
        const format = options.format ?? initialOptions.format;
        const virtualOutDir = this.getFullOutDir() || this.getWorkingDir();
        const entryPoints = options.entryPoints;

        /** @type {import('esbuild').BuildOptions} */
        const config = {
            ...this.getOptions(),
            entryPoints: entryPoints.map((entryPoint) => {
                if (typeof entryPoint === 'string') {
                    return entryPoint;
                }

                return entryPoint.path;
            }),
            format,
            outdir: options.outdir ? path.resolve(virtualOutDir, `./${options.outdir}`) : this.getFullOutDir(),
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
        this.state.builds.add(result);

        return result;
    }
}
