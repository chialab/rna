import path from 'path';
import { rename, rm } from 'fs/promises';
import * as cheerio from 'cheerio';
import { createResult, assignToResult, useRna } from '@chialab/esbuild-rna';
import beautify from 'js-beautify';

/**
 * @typedef {import('esbuild').Metafile} Metafile
 */

/**
 * Cheerio esm support is unstable for some Node versions.
 */
const loadHtml = /** @type {typeof cheerio.load} */ (cheerio.load || cheerio.default?.load);

/**
 * @typedef {Object} Build
 * @property {import('esbuild').Loader} [loader] The loader to use.
 * @property {import('@chialab/esbuild-rna').EmitTransformOptions} options The file name of the referenced file.
 * @property {(outputFiles: import('esbuild').OutputFile[]) => Promise<void>|void} finisher A callback function to invoke when output file has been generated.
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
            const { write = true } = build.initialOptions;
            const { resolve, load, workingDir, rootDir, outDir, onTransform, emitFile, emitChunk } = useRna(build);
            if (!outDir) {
                throw new Error('Cannot use the html plugin without an outdir.');
            }

            // force metafile in order to collect output data.
            build.initialOptions.metafile = build.initialOptions.metafile || write !== false;

            /**
             * @type {import('@chialab/esbuild-rna').BuildResult}
             */
            let collectedResult;

            build.onStart(() => {
                collectedResult = createResult();
            });

            build.onEnd(async (result) => {
                if (result.outputFiles) {
                    const htmlFile = result.outputFiles[0].path;
                    if (htmlFile.endsWith('.html')) {
                        const jsFile = result.outputFiles[1].path;
                        result.outputFiles[0].path = path.join(jsFile, `${path.basename(jsFile, path.extname(jsFile))}.html`);
                        result.outputFiles.splice(1, 1);
                    }
                }
                if (result.metafile && write) {
                    const outputs = { ...result.metafile.outputs };
                    for (const outputKey in outputs) {
                        const output = outputs[outputKey];
                        if (path.extname(outputKey) !== '.html') {
                            if (output.entryPoint && path.extname(output.entryPoint) === '.html') {
                                await rm(outputKey);
                                try {
                                    await rm(`${outputKey}.map`);
                                } catch(err) {
                                    //
                                }
                                delete result.metafile.outputs[outputKey];
                            }
                            continue;
                        }
                        for (const inputKey in output.inputs) {
                            if (path.extname(inputKey) !== '.html') {
                                continue;
                            }

                            const newOutputKey = path.join(path.dirname(outputKey), path.basename(inputKey));
                            if (newOutputKey === outputKey) {
                                continue;
                            }

                            await rename(
                                outputKey,
                                newOutputKey
                            );

                            delete result.metafile.outputs[outputKey];
                            result.metafile.outputs[newOutputKey] = output;

                            break;
                        }
                    }
                }

                assignToResult(result, collectedResult);
            });

            onTransform({ filter: /\.html$/ }, async (args) => {
                const basePath = path.dirname(args.path);
                const [
                    { collectStyles },
                    { collectScripts },
                    { collectAssets },
                    { collectWebManifest },
                    { collectIcons },
                ] = await Promise.all([
                    import('./collectStyles.js'),
                    import('./collectScripts.js'),
                    import('./collectAssets.js'),
                    import('./collectWebManifest.js'),
                    import('./collectIcons.js'),
                ]);

                const code = args.code.toString();
                const relativePath = `./${path.relative(rootDir, basePath)}`;
                const relativeOutDir = path.resolve(path.resolve(workingDir, outDir), relativePath);
                const $ = loadHtml(code);
                const root = $.root();

                const builds = /** @type {Build[]} */ ([
                    ...collectIcons($, root, {
                        source: args.path,
                        outDir: relativeOutDir,
                        rootDir,
                    }, {
                        resolve,
                        load,
                    }),
                    ...collectWebManifest($, root, basePath, relativeOutDir),
                    ...collectStyles($, root, basePath, relativeOutDir, build.initialOptions),
                    ...collectScripts($, root, basePath, relativeOutDir, { scriptsTarget, modulesTarget }),
                    ...collectAssets($, root, basePath, relativeOutDir, build.initialOptions),
                ]);

                for (let i = 0; i < builds.length; i++) {
                    const currentBuild = builds[i];
                    const entryPoint = currentBuild.options.entryPoint;
                    if (!entryPoint) {
                        continue;
                    }

                    if (currentBuild.options.contents) {
                        const { outputFiles } = await emitChunk(currentBuild.options);

                        await currentBuild.finisher(outputFiles);
                        continue;
                    }

                    const resolvedFile = await resolve({
                        kind: 'dynamic-import',
                        path: entryPoint,
                        importer: args.path,
                        resolveDir: rootDir,
                        pluginData: null,
                        namespace: 'file',
                    });
                    if (!resolvedFile.path) {
                        continue;
                    }

                    if (currentBuild.loader === 'file') {
                        const fileBuffer = await load({
                            path: resolvedFile.path,
                            namespace: resolvedFile.namespace || 'file',
                            pluginData: resolvedFile.pluginData,
                        });

                        if (!fileBuffer.contents) {
                            continue;
                        }

                        const { outputFiles } = await emitFile(resolvedFile.path, Buffer.from(fileBuffer.contents));

                        await currentBuild.finisher(outputFiles);
                        continue;
                    }

                    const { outputFiles } = await emitChunk({
                        ...currentBuild.options,
                        entryPoint: resolvedFile.path,
                    });
                    await currentBuild.finisher(outputFiles);
                }

                return {
                    code: beautify.html($.html().replace(/\n\s*$/gm, '')),
                    loader: 'file',
                    watchFiles: builds.reduce((acc, build) => [
                        ...acc,
                        build.options.entryPoint,
                    ], /** @type {string[]} */([])),
                };
            });
        },
    };

    return plugin;
}
