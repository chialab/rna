import path from 'path';
import { readFile } from 'fs/promises';
import { createResult, assignToResult, getMainOutput, esbuildFile } from '@chialab/esbuild-helpers';

/**
 * @typedef {Object} Build
 * @property {import('esbuild').Loader} [loader] The loader to use.
 * @property {Partial<import('esbuild').BuildOptions>} options The file name of the referenced file.
 * @property {(filePath: string, outputFiles: string[]) => Promise<void>|void} finisher A callback function to invoke when output file has been generated.
 */

/**
 * @typedef {{ scriptsTarget?: string, modulesTarget?: string }} PluginOptions
 */

/**
 * A HTML loader plugin for esbuild.
 * @param {PluginOptions} options
 * @param {typeof import('esbuild')} [esbuildModule]
 * @return An esbuild plugin.
 */
export default function({ scriptsTarget = 'es2015', modulesTarget = 'es2020' } = {}, esbuildModule) {
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
            const fullInput = input && path.resolve(sourceRoot || process.cwd(), input);

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
                    cheerio,
                    { collectStyles },
                    { collectScripts },
                    { collectAssets },
                    { collectWebManifest },
                    { collectIcons },
                    esbuild,
                ] = await Promise.all([
                    import('cheerio'),
                    import('./collectStyles.js'),
                    import('./collectScripts.js'),
                    import('./collectAssets.js'),
                    import('./collectWebManifest.js'),
                    import('./collectIcons.js'),
                    esbuildModule || import('esbuild'),
                ]);

                /**
                 * Cheerio esm support is unstable for some Node versions.
                 */
                const load = /** @type {typeof cheerio.load} */ (cheerio.load || cheerio.default?.load);

                const contents = filePath === fullInput && stdin ? stdin.contents : await readFile(filePath, 'utf-8');
                const basePath = path.dirname(filePath);
                const outdir = /** @type {string} */ (options.outdir || (options.outfile && path.dirname(options.outfile)));
                const $ = load(contents);
                const root = $.root();

                const builds = /** @type {Build[]} */ ([
                    ...collectIcons($, root, basePath, outdir),
                    ...collectWebManifest($, root, basePath, outdir),
                    ...collectStyles($, root, basePath, outdir, options),
                    ...collectScripts($, root, basePath, outdir, { scriptsTarget, modulesTarget }, options),
                    ...collectAssets($, root, basePath, outdir, options),
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
