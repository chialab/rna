import path from 'path';
import { copyFile, readFile, rm } from 'fs/promises';
import * as cheerio from 'cheerio';
import beautify from 'js-beautify';
import { useRna } from '@chialab/esbuild-rna';

/**
 * @typedef {import('esbuild').Metafile} Metafile
 */

/**
 * Cheerio esm support is unstable for some Node versions.
 */
const loadHtml = /** @type {typeof cheerio.load} */ (cheerio.load || cheerio.default?.load);

/**
 * @typedef {Object} CollectResult
 * @property {import('@chialab/esbuild-rna').EmitTransformOptions} [build] The build instruction for collected files.
 * @property {(files: string[]) => Promise<string[]|void>|void} [finisher] A callback function to invoke when output file has been generated.
 */

/**
 * @typedef {Object} PluginOptions
 * @property {import('@chialab/rna-config-loader').Target} [scriptsTarget]
 * @property {import('@chialab/rna-config-loader').Target} [modulesTarget]
 * @property {string} [entryNames]
 * @property {string} [chunkNames]
 * @property {string} [assetNames]
 */

/**
 * @typedef {Object} BuildOptions
 * @property {string} sourceDir
 * @property {string} outDir
 * @property {string[]} target
 */

/**
 * @typedef {Object} Helpers
 * @property {(ext: string, suggestion?: string) => string} createEntry
 * @property {(path: string, contents: string|Buffer) => Promise<import('@chialab/esbuild-rna').Chunk>} emitFile
 * @property {(options: import('@chialab/esbuild-rna').EmitTransformOptions) => Promise<import('@chialab/esbuild-rna').Chunk>} emitChunk
 * @property {(file: string) => Promise<import('esbuild').OnResolveResult>} resolve
 * @property {(file: string, options: Partial<import('esbuild').OnLoadArgs>) => Promise<import('esbuild').OnLoadResult>} load
 */

/**
 * @typedef {($: import('cheerio').CheerioAPI, dom: import('cheerio').Cheerio<import('cheerio').Document>, options: BuildOptions, helpers: Helpers) => Promise<CollectResult[]>} Collector
 */

/**
 * A HTML loader plugin for esbuild.
 * @param {PluginOptions} options
 * @return An esbuild plugin.
 */
export default function({
    scriptsTarget = 'es2015',
    modulesTarget = 'es2020',
} = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'html',
        setup(build) {
            const { plugins = [], write = true, entryNames = '[name]' } = build.initialOptions;
            const { load, workingDir, rootDir, outDir, onTransform, emitFile, emitChunk, computeName } = useRna(build);
            if (!outDir) {
                throw new Error('Cannot use the html plugin without an outdir.');
            }

            // force metafile in order to collect output data.
            build.initialOptions.metafile = build.initialOptions.metafile || write !== false;

            /**
             * @type {string[]}
             */
            const entryPoints = [];

            build.onStart(() => {
                entryPoints.splice(0, entryPoints.length);
            });

            build.onEnd(async (result) => {
                const metafile = result.metafile;
                if (!metafile) {
                    return;
                }
                const outputs = metafile.outputs;

                await Promise.all(
                    Object.entries(outputs).map(async ([outputFile, output]) => {
                        const inputs = Object.keys(output.inputs);
                        if (!inputs.length) {
                            return;
                        }

                        const mainInput = path.resolve(workingDir, inputs[0]);
                        if (!entryPoints.includes(mainInput)) {
                            return;
                        }

                        const actualOutputFile = path.resolve(workingDir, outputFile);
                        if (output.entryPoint) {
                            // esbuild js file
                            delete outputs[outputFile];

                            if (write) {
                                await rm(actualOutputFile);
                            } else if (result.outputFiles) {
                                result.outputFiles = result.outputFiles.filter((file) => file.path !== actualOutputFile);
                            }

                            if (outputs[`${outputFile}.map`]) {
                                const actualOutputMapFile = path.resolve(workingDir, `${outputFile}.map`);
                                delete outputs[`${outputFile}.map`];

                                if (write) {
                                    await rm(actualOutputMapFile);
                                } else if (result.outputFiles) {
                                    result.outputFiles = result.outputFiles.filter((file) => file.path !== actualOutputMapFile);
                                }
                            }
                        } else {
                            // real html output
                            const resultOutputFile = result.outputFiles && result.outputFiles.find((file) => file.path === actualOutputFile);
                            if (!resultOutputFile && !write) {
                                return;
                            }

                            const buffer = resultOutputFile ? Buffer.from(resultOutputFile.contents) : await readFile(actualOutputFile);
                            const finalOutputFile = path.resolve(workingDir, outDir, computeName(entryNames, mainInput, buffer));

                            delete outputs[outputFile];
                            outputs[path.relative(workingDir, finalOutputFile)] = output;

                            if (write) {
                                if (actualOutputFile !== finalOutputFile) {
                                    await copyFile(actualOutputFile, finalOutputFile);
                                    await rm(actualOutputFile);
                                }
                            } else if (resultOutputFile) {
                                resultOutputFile.path = finalOutputFile;
                            }
                        }
                    })
                );
            });

            onTransform({ filter: /\.html$/ }, async (args) => {
                entryPoints.push(args.path);

                const basePath = path.dirname(args.path);
                const [
                    { collectStyles },
                    { collectScripts },
                    { collectAssets },
                    { collectWebManifest },
                    { collectIcons },
                    { collectScreens },
                ] = await Promise.all([
                    import('./collectStyles.js'),
                    import('./collectScripts.js'),
                    import('./collectAssets.js'),
                    import('./collectWebManifest.js'),
                    import('./collectIcons.js'),
                    import('./collectScreens.js'),
                ]);

                const code = args.code;
                const relativePath = `./${path.relative(rootDir, basePath)}`;
                const relativeOutDir = path.resolve(path.resolve(workingDir, outDir), relativePath);
                const $ = loadHtml(code);
                const root = $.root();
                let count = 0;

                /**
                 * @param {string} file
                 */
                const resolveFile = (file) => build.resolve(file.startsWith('./') || file.startsWith('../') ? file : `./${file}`, {
                    kind: 'dynamic-import',
                    importer: args.path,
                    resolveDir: path.dirname(args.path),
                    pluginData: null,
                    namespace: 'file',
                });

                /**
                 * @param {string} path
                 * @param {Partial<import('esbuild').OnLoadArgs>} [options]
                 */
                const loadFile = (path, options = {}) => load({
                    pluginData: null,
                    namespace: 'file',
                    suffix: '',
                    ...options,
                    path,
                });

                const collectOptions = {
                    sourceDir: path.dirname(args.path),
                    outDir: relativeOutDir,
                    target: [scriptsTarget, modulesTarget],
                };

                /**
                 * Get entry name.
                 *
                 * @param {string} ext
                 * @param {string|undefined} suggestion
                 * @return {string}
                 */
                const createEntry = (ext, suggestion) => {
                    const i = ++count;

                    return `${suggestion ? `${suggestion}${i}` : i}.${ext}`;
                };

                const helpers = {
                    createEntry,
                    emitFile,
                    emitChunk,
                    resolve: resolveFile,
                    load: loadFile,
                };

                const collected = /** @type {CollectResult[]} */ ((await Promise.all([
                    collectIcons($, root, collectOptions, helpers),
                    collectScreens($, root, collectOptions, helpers),
                    collectWebManifest($, root, collectOptions, helpers),
                    collectStyles($, root, collectOptions, helpers),
                    collectScripts($, root, collectOptions, helpers),
                    collectAssets($, root),
                ])).flat());

                const results = await Promise.all(
                    collected.map(async (collectResult) => {
                        const { build } = collectResult;
                        if (!build) {
                            return;
                        }

                        const entryPoint = build.entryPoint;
                        if (!entryPoint) {
                            return;
                        }

                        if (build.contents) {
                            if (build.loader === 'file') {
                                return emitFile(entryPoint, Buffer.from(build.contents));
                            }

                            return emitChunk({
                                ...build,
                                entryPoint,
                                plugins: plugins.filter((plugin) => plugin.name !== 'html'),
                            });
                        }

                        const resolvedFile = await resolveFile(entryPoint);
                        if (!resolvedFile.path) {
                            throw new Error(`Cannot resolve ${entryPoint}`);
                        }

                        if (build.loader === 'file') {
                            const fileBuffer = await loadFile(resolvedFile.path, resolvedFile);

                            if (!fileBuffer.contents) {
                                throw new Error(`Cannot load ${resolvedFile.path}`);
                            }

                            return emitFile(resolvedFile.path, Buffer.from(fileBuffer.contents));
                        }

                        return emitChunk({
                            ...build,
                            entryPoint: resolvedFile.path,
                            plugins: plugins.filter((plugin) => plugin.name !== 'html'),
                        });
                    })
                );

                const fullOutDir = path.dirname(path.resolve(workingDir, outDir, computeName(entryNames, args.path, '')));

                for (let i = 0; i < collected.length; i++) {
                    const { build, finisher } = collected[i];
                    if (finisher) {
                        const result = results[i];
                        if (build && result) {
                            const outputs = result.metafile.outputs;
                            const keys = Object.keys(outputs);
                            const entryPoint = path.relative(workingDir, build.entryPoint);
                            const mainKey = keys.find((key) => outputs[key].entryPoint === entryPoint);
                            if (mainKey) {
                                keys.splice(keys.indexOf(mainKey), 1);
                                keys.unshift(mainKey);
                            }
                            const files = keys.map((file) => {
                                const fullFile = path.resolve(workingDir, file);
                                return path.relative(fullOutDir, fullFile);
                            });
                            await finisher(files);
                        } else {
                            await finisher([]);
                        }
                    }
                }

                return {
                    code: beautify.html($.html().replace(/\n\s*$/gm, '')),
                    loader: 'file',
                    watchFiles: collected.filter((collectResult) => collectResult.build?.entryPoint).reduce((acc, build) => [
                        ...acc,
                        /** @type {string} */ (build.build?.entryPoint),
                    ], /** @type {string[]} */ ([])),
                };
            });
        },
    };

    return plugin;
}
