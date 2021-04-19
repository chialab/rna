import path from 'path';
import { promises } from 'fs';
import esbuildModule from 'esbuild';
import $ from 'cheerio';
import { collectStyles } from './collectStyles.js';
import { collectScripts } from './collectScripts.js';
import { collectAssets } from './collectAssets.js';
import { collectWebManifest } from './collectWebManifest.js';
import { collectIcons } from './collectIcons.js';

const { readFile, unlink } = promises;

/**
 * @typedef {Object} Entrypoint
 * @property {import('esbuild').Loader} [loader] The loader to use.
 * @property {Partial<import('esbuild').BuildOptions>} options The file name of the referenced file.
 * @property {(filePath: string, outputFiles: string[]) => Promise<void>|void} finisher A callback function to invoke when output file has been generated.
 */

/**
 * @return An esbuild plugin.
 */
export function htmlPlugin({ esbuild = esbuildModule } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'html',
        setup(build) {
            let options = build.initialOptions;

            build.onLoad({ filter: /\.html$/ }, async ({ path: filePath }) => {
                let contents = await readFile(filePath, 'utf-8');
                let basePath = path.dirname(filePath);
                let outdir = options.outdir || (options.outfile && path.dirname(options.outfile)) || process.cwd();
                let dom = $.load(contents);
                let root = dom.root();

                let entrypoints = /** @type {Entrypoint[]} */ ([
                    ...collectIcons(root, basePath, outdir),
                    ...collectWebManifest(root, basePath, outdir),
                    ...collectStyles(root, basePath, outdir),
                    ...collectScripts(root, basePath, outdir),
                    ...collectAssets(root, basePath, outdir),
                ]);

                for (let i = 0; i < entrypoints.length; i++) {
                    let entrypoint = entrypoints[i];
                    /** @type {import('esbuild').BuildOptions} */
                    let config = {
                        ...options,
                        outfile: undefined,
                        outdir,
                        metafile: true,
                        external: [],
                        ...entrypoint.options,
                    };
                    let result = await esbuild.build(config);
                    if (!result.metafile) {
                        return;
                    }

                    let inputFiles = /** @type {string[]} */ (entrypoint.options.entryPoints || []);
                    let outputs = result.metafile.outputs;
                    let outputFiles = Object.keys(outputs);
                    let outputFile = outputFiles
                        .filter((output) => !output.endsWith('.map'))
                        .filter((output) => outputs[output].entryPoint)
                        .find((output) => inputFiles.includes(path.resolve(/** @type {string} */(outputs[output].entryPoint)))) || outputFiles[0];
                    await entrypoint.finisher(outputFile, outputFiles);

                    if (entrypoint.loader === 'file') {
                        await Promise.all(
                            outputFiles.slice(1).map((fileName) => unlink(fileName).catch(() => {}))
                        );
                    }
                }

                return {
                    contents: dom.html(),
                    loader: 'file',
                };
            });
        },
    };

    return plugin;
}
