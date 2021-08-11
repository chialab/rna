import path from 'path';
import { readFile } from 'fs/promises';
import * as cheerio from 'cheerio';
import { createResult, assignToResult, getMainOutput, esbuildFile } from '@chialab/esbuild-helpers';

/**
 * Cheerio esm support is unstable for some Node versions.
 */
const load = /** @type {typeof cheerio.load} */ (cheerio.load || cheerio.default?.load);

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
    entryNames,
    chunkNames,
    assetNames,
} = {}, esbuildModule) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'html',
        setup(build) {
            const options = build.initialOptions;
            const { stdin, sourceRoot, absWorkingDir } = options;
            const rootDir = sourceRoot || absWorkingDir || process.cwd();
            const input = stdin ? stdin.sourcefile : undefined;
            const fullInput = input && path.resolve(rootDir, input);

            /**
             * @type {import('esbuild').BuildResult}
             */
            let collectedResult;

            build.onStart(() => {
                collectedResult = createResult();
            });

            build.onEnd((result) => {
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

                const contents = filePath === fullInput && stdin ? stdin.contents : await readFile(filePath, 'utf-8');
                const basePath = path.dirname(filePath);
                const outdir = /** @type {string} */ (options.outdir || (options.outfile && path.dirname(options.outfile)));
                const $ = load(contents);
                const root = $.root();
                const childOptions = {
                    ...options,
                    entryNames: entryNames || options.entryNames,
                    chunkNames: chunkNames || options.chunkNames,
                    assetNames: assetNames || options.assetNames,
                };

                const builds = /** @type {Build[]} */ ([
                    ...collectIcons($, root, basePath, outdir),
                    ...collectWebManifest($, root, basePath, outdir),
                    ...collectStyles($, root, basePath, outdir, childOptions),
                    ...collectScripts($, root, basePath, outdir, { scriptsTarget, modulesTarget }, childOptions),
                    ...collectAssets($, root, basePath, outdir, childOptions),
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
                        outdir,
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
