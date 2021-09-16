import path from 'path';
import { readFile, rename, rm } from 'fs/promises';
import * as cheerio from 'cheerio';
import { createResult, assignToResult, getMainOutput, esbuildFile } from '@chialab/esbuild-helpers';

/**
 * Cheerio esm support is unstable for some Node versions.
 */
const load = /** @type {typeof cheerio.load} */ (cheerio.load || cheerio.default?.load);

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
 * @property {(filePath: string, outputFiles: string[]) => Promise<void>|void} finisher A callback function to invoke when output file has been generated.
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
            const options = build.initialOptions;
            // force metafile in order to collect output data.
            options.metafile = options.write !== false;
            options.assetNames = '[dir]/[name]';
            const { entryPoints = [], stdin, sourceRoot, absWorkingDir, assetNames, outdir, outfile } = options;
            const rootDir = sourceRoot || absWorkingDir || process.cwd();
            const outDir = /** @type {string} */(outdir || (outfile && path.dirname(outfile)));
            const sourceFiles = Array.isArray(entryPoints) ? entryPoints : Object.values(entryPoints);
            const sourceDir = commonDir(sourceFiles.map((file) => path.resolve(rootDir, file)));
            const input = stdin ? stdin.sourcefile : undefined;
            const fullInput = input && path.resolve(rootDir, input);

            /**
             * @type {import('esbuild').BuildResult}
             */
            let collectedResult;

            build.onStart(() => {
                collectedResult = createResult();
            });

            build.onEnd(async (result) => {
                if (result.metafile && options.write !== false) {
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

            build.onLoad({ filter: /\.html$/ }, async ({ path: filePath }) => {
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

                const contents = filePath === fullInput && stdin ?
                    stdin.contents.toString() :
                    await readFile(filePath, 'utf-8');
                const basePath = path.dirname(filePath);
                const relativePath = `./${path.relative(sourceDir, basePath)}`;
                const relativeOutDir = path.resolve(outDir, relativePath);
                const $ = load(contents);
                const root = $.root();

                const builds = /** @type {Build[]} */ ([
                    ...collectIcons($, root, basePath, relativeOutDir),
                    ...collectWebManifest($, root, basePath, relativeOutDir),
                    ...collectStyles($, root, basePath, relativeOutDir, options),
                    ...collectScripts($, root, basePath, relativeOutDir, { scriptsTarget, modulesTarget }, options),
                    ...collectAssets($, root, basePath, relativeOutDir, options),
                ]);

                for (let i = 0; i < builds.length; i++) {
                    const build = builds[i];

                    /** @type {string[]} */
                    const outputFiles = [];

                    const entryPoints = /** @type {string[]|undefined}} */ (build.options.entryPoints);
                    if (!entryPoints || entryPoints.length === 0) {
                        continue;
                    }

                    if (build.loader === 'file') {
                        const file = entryPoints[0];

                        const { result, outputFile } = await esbuildFile(file, {
                            ...options,
                            assetNames,
                            ...build.options,
                        });

                        outputFiles.push(outputFile);
                        assignToResult(collectedResult, result);

                        await build.finisher(outputFile, outputFiles);
                        continue;
                    }

                    /** @type {import('esbuild').BuildOptions} */
                    const config = {
                        ...options,
                        outfile: undefined,
                        outdir: relativeOutDir,
                        metafile: true,
                        external: [],
                        ...build.options,
                    };

                    const result = await esbuild.build(config);
                    const outputFile = getMainOutput(entryPoints, /** @type {import('esbuild').Metafile} */ (result.metafile), rootDir);

                    assignToResult(collectedResult, result);

                    await build.finisher(outputFile, outputFiles);
                }

                return {
                    contents: $.html(),
                    loader: 'file',
                    watchFiles: builds.reduce((acc, build) => [
                        ...acc,
                        ...(/** @type {string[]} */ (build.options.entryPoints) || []),
                    ], /** @type {string[]} */ ([])),
                };
            });
        },
    };

    return plugin;
}
