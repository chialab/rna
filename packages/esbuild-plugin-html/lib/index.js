import path from 'path';
import { rename, rm } from 'fs/promises';
import * as cheerio from 'cheerio';
import { createResult, assignToResult, useRna, getOutputFiles, esbuildFile } from '@chialab/esbuild-rna';

/**
 * @typedef {import('esbuild').Metafile} Metafile
 */

/**
 * @typedef {import('esbuild').BuildResult & { metafile: Metafile, outputFiles?: import('esbuild').OutputFile[] }} BuildResult
 */

/**
 * Cheerio esm support is unstable for some Node versions.
 */
const loadHtml = /** @type {typeof cheerio.load} */ (cheerio.load || cheerio.default?.load);

/**
 * Get the common dir of source files.
 * @param {string[]} files
 * @return The common dir.
 */
function commonDir(files) {
    if (files.length === 0) {
        return path.sep;
    }
    if (files.length === 1) {
        return path.dirname(files[0]);
    }
    const res = files.slice(1).reduce((dir, file) => {
        const xs = file.split(path.sep);
        let i;
        for (i = 0; dir[i] === xs[i] && i < Math.min(dir.length, xs.length); i++);
        return dir.slice(0, i);
    }, files[0].split(path.sep));

    // Windows correctly handles paths with forward-slashes
    return res.length > 1 ? res.join(path.sep) : path.sep;
}

/**
 * @typedef {Object} Build
 * @property {import('esbuild').Loader} [loader] The loader to use.
 * @property {Partial<import('esbuild').BuildOptions>} options The file name of the referenced file.
 * @property {(outputFiles: string[]) => Promise<void>|void} finisher A callback function to invoke when output file has been generated.
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
 * @param {typeof import('esbuild')} [esbuildModule]
 * @return An esbuild plugin.
 */
export default function({
    scriptsTarget = 'es2015',
    modulesTarget = 'es2020',
} = {}, esbuildModule) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'html',
        setup(build) {
            const { entryPoints = [], assetNames, write } = build.initialOptions;
            const { resolve, load, rootDir, outDir, onTransform } = useRna(build);
            const sourceFiles = Array.isArray(entryPoints) ? entryPoints : Object.values(entryPoints);
            const sourceDir = sourceFiles.length ? commonDir(sourceFiles.map((file) => path.resolve(rootDir, file))) : rootDir;

            // force metafile in order to collect output data.
            build.initialOptions.metafile = build.initialOptions.metafile || write !== false;

            /**
             * @type {BuildResult}
             */
            let collectedResult;

            build.onStart(() => {
                collectedResult = createResult();
            });

            build.onEnd(async (result) => {
                if (result.metafile && write !== false) {
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
                    esbuild,
                ] = await Promise.all([
                    import('./collectStyles.js'),
                    import('./collectScripts.js'),
                    import('./collectAssets.js'),
                    import('./collectWebManifest.js'),
                    import('./collectIcons.js'),
                    esbuildModule || import('esbuild'),
                ]);

                const code = args.code.toString();
                const relativePath = `./${path.relative(sourceDir, basePath)}`;
                const relativeOutDir = path.resolve(outDir, relativePath);
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
                    ...collectScripts($, root, basePath, relativeOutDir, { scriptsTarget, modulesTarget }, build.initialOptions),
                    ...collectAssets($, root, basePath, relativeOutDir, build.initialOptions),
                ]);

                for (let i = 0; i < builds.length; i++) {
                    const currentBuild = builds[i];

                    const entryPoints = /** @type {string[]|undefined}} */ (currentBuild.options.entryPoints);
                    if (!entryPoints || entryPoints.length === 0) {
                        continue;
                    }

                    if (currentBuild.loader === 'file') {
                        const file = entryPoints[0];
                        const resolvedFile = await resolve({
                            kind: 'dynamic-import',
                            path: file,
                            importer: args.path,
                            resolveDir: rootDir,
                            pluginData: null,
                            namespace: 'file',
                        });
                        if (!resolvedFile.path) {
                            continue;
                        }

                        const fileBuffer = await load({
                            path: resolvedFile.path,
                            namespace: resolvedFile.namespace || 'file',
                            pluginData: resolvedFile.pluginData,
                        });

                        if (!fileBuffer.contents) {
                            continue;
                        }

                        const { result, outputFile } = await esbuildFile(resolvedFile.path, Buffer.from(fileBuffer.contents), {
                            ...build.initialOptions,
                            assetNames: assetNames || '[dir]/[name]',
                            ...currentBuild.options,
                        });

                        assignToResult(collectedResult, result);

                        await currentBuild.finisher([outputFile]);
                        continue;
                    }

                    /** @type {import('esbuild').BuildOptions} */
                    const config = {
                        ...build.initialOptions,
                        outfile: undefined,
                        outdir: relativeOutDir,
                        metafile: true,
                        external: [],
                        ...currentBuild.options,
                    };

                    const result = /** @type {BuildResult} */ (await esbuild.build({
                        assetNames: '[dir]/[name]',
                        ...config,
                    }));
                    assignToResult(collectedResult, result);

                    const outputFiles = getOutputFiles(entryPoints, result.metafile, rootDir);
                    await currentBuild.finisher(outputFiles);
                }

                return {
                    code: $.html(),
                    loader: 'file',
                    watchFiles: builds.reduce((acc, build) => [
                        ...acc,
                        ...(/** @type {string[]} */ (build.options.entryPoints) || []),
                    ], /** @type {string[]} */([])),
                };
            });
        },
    };

    return plugin;
}
