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
 * @typedef {Object} PluginOptions
 * @property {string} [scriptsTarget]
 * @property {string} [modulesTarget]
 * @property {string} [entryNames]
 * @property {string} [chunkNames]
 * @property {string} [assetNames]
 */

/**
 * @typedef {Object} BuildOptions
 * @property {string} sourceDir
 * @property {string} outDir
 * @property {string} entryDir
 * @property {string} workingDir
 * @property {string[]} target
 */

/**
 * @typedef {Object} Helpers
 * @property {(ext: string, suggestion?: string) => string} createEntry
 * @property {(path: string, contents?: string|Buffer) => Promise<import('@chialab/esbuild-rna').Chunk>} emitFile
 * @property {(options: import('@chialab/esbuild-rna').EmitChunkOptions) => Promise<import('@chialab/esbuild-rna').Chunk>} emitChunk
 * @property {(options: import('@chialab/esbuild-rna').EmitBuildOptions) => Promise<import('@chialab/esbuild-rna').Result>} emitBuild
 * @property {(file: string) => Promise<import('esbuild').OnResolveResult>} resolve
 * @property {(file: string, options: Partial<import('esbuild').OnLoadArgs>) => Promise<import('esbuild').OnLoadResult>} load
 */

/**
 * @typedef {($: import('cheerio').CheerioAPI, dom: import('cheerio').Cheerio<import('cheerio').Document>, options: BuildOptions, helpers: Helpers) => Promise<import('@chialab/esbuild-rna').OnTransformResult[]>} Collector
 */

/**
 * A HTML loader plugin for esbuild.
 * @param {PluginOptions} options
 * @returns An esbuild plugin.
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
        setup(pluginBuild) {
            const build = useRna(pluginBuild);
            const { write = true, entryNames = '[name]' } = build.getOptions();
            const outDir = build.getOutDir();
            if (!outDir) {
                throw new Error('Cannot use the html plugin without an outdir.');
            }

            // force metafile in order to collect output data.
            build.setOption('metafile', build.getOption('metafile') || write !== false);

            /**
             * @type {string[]}
             */
            const entryPoints = [];
            const workingDir = build.getWorkingDir();

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
                            const finalOutputFile = path.resolve(workingDir, outDir, build.computeName(entryNames, mainInput, buffer));

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

            build.onTransform({ filter: /\.html$/ }, async (args) => {
                entryPoints.push(args.path);

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
                const $ = loadHtml(code);
                const root = $.root();
                let count = 0;

                /**
                 * @param {string} file
                 */
                const resolveFile = (file) => build.resolveLocallyFirst(file, {
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
                const loadFile = (path, options = {}) => build.load({
                    pluginData: null,
                    namespace: 'file',
                    suffix: '',
                    ...options,
                    path,
                });

                const collectOptions = {
                    sourceDir: path.dirname(args.path),
                    workingDir,
                    outDir: path.resolve(workingDir, outDir),
                    entryDir: path.dirname(path.resolve(workingDir, outDir, build.computeName(entryNames, args.path, ''))),
                    target: [scriptsTarget, modulesTarget],
                };

                /**
                 * Get entry name.
                 *
                 * @param {string} ext
                 * @param {string|undefined} suggestion
                 * @returns {string}
                 */
                const createEntry = (ext, suggestion) => {
                    const i = ++count;

                    return `${suggestion ? `${suggestion}${i}` : i}.${ext}`;
                };

                const helpers = {
                    createEntry,
                    emitFile: build.emitFile.bind(build),
                    emitChunk: build.emitChunk.bind(build),
                    emitBuild: build.emitBuild.bind(build),
                    resolve: resolveFile,
                    load: loadFile,
                };

                const results = await collectWebManifest($, root, collectOptions, helpers);
                results.push(...await collectScreens($, root, collectOptions, helpers));
                results.push(...await collectIcons($, root, collectOptions, helpers));
                results.push(...await collectAssets($, root, collectOptions, helpers));
                results.push(...await collectStyles($, root, collectOptions, helpers));
                results.push(...await collectScripts($, root, collectOptions, helpers));

                return {
                    code: beautify.html($.html().replace(/\n\s*$/gm, '')),
                    loader: 'file',
                    watchFiles: results.reduce((acc, result) => {
                        if (!result || !result.watchFiles) {
                            return acc;
                        }

                        return [...acc, ...result.watchFiles];
                    }, /** @type {string[]} */ ([])),
                };
            });
        },
    };

    return plugin;
}
