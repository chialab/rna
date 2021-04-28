import path from 'path';
import crypto from 'crypto';
import { promises } from 'fs';
import esbuildModule from 'esbuild';
import $ from 'cheerio';
import { collectStyles } from './collectStyles.js';
import { collectScripts } from './collectScripts.js';
import { collectAssets } from './collectAssets.js';
import { collectWebManifest } from './collectWebManifest.js';
import { collectIcons } from './collectIcons.js';

const { readFile, writeFile, mkdir } = promises;

/**
 * @typedef {Object} Entrypoint
 * @property {import('esbuild').Loader} [loader] The loader to use.
 * @property {Partial<import('esbuild').BuildOptions>} options The file name of the referenced file.
 * @property {(filePath: string, outputFiles: string[]) => Promise<void>|void} finisher A callback function to invoke when output file has been generated.
 */

/**
 * @return An esbuild plugin.
 */
export default function({ esbuild = esbuildModule, scriptsTarget = 'es6', modulesTarget = 'es2020' } = {}) {
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
                let outdir = /** @type {string} */ (options.outdir || (options.outfile && path.dirname(options.outfile)));
                let dom = $.load(contents);
                let root = dom.root();

                let entrypoints = /** @type {Entrypoint[]} */ ([
                    ...collectIcons(root, basePath, outdir),
                    ...collectWebManifest(root, basePath, outdir),
                    ...collectStyles(root, basePath, outdir),
                    ...collectScripts(root, basePath, outdir, { scriptsTarget, modulesTarget }),
                    ...collectAssets(root, basePath, outdir),
                ]);

                for (let i = 0; i < entrypoints.length; i++) {
                    let entrypoint = entrypoints[i];
                    /** @type {string} */
                    let outputFile;
                    /** @type {string[]} */
                    let outputFiles = [];
                    if (entrypoint.loader === 'file') {
                        let files = /** @type {string[]|undefined}} */ (entrypoint.options.entryPoints);
                        let file = files && files[0];
                        if (!file) {
                            continue;
                        }
                        let ext = path.extname(file);
                        let basename = path.basename(file, ext);
                        let buffer = await readFile(file);
                        let assetNames = entrypoint.options.assetNames || options.assetNames || '[name]';
                        let computedName = assetNames
                            .replace('[name]', basename)
                            .replace('[hash]', () => {
                                let hash = crypto.createHash('sha1');
                                hash.update(buffer);
                                return hash.digest('hex').substr(0, 8);
                            });
                        computedName += ext;
                        outputFile = path.join(outdir, computedName);
                        await mkdir(path.dirname(outputFile), {
                            recursive: true,
                        });
                        await writeFile(outputFile, buffer);
                        outputFile = path.relative(process.cwd(), outputFile);
                        outputFiles.push(outputFile);
                    } else {
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
                            continue;
                        }

                        let inputFiles = /** @type {string[]} */ (entrypoint.options.entryPoints || []);
                        let outputs = result.metafile.outputs;
                        let outputFiles = Object.keys(outputs);
                        outputFile = outputFiles
                            .filter((output) => !output.endsWith('.map'))
                            .filter((output) => outputs[output].entryPoint)
                            .find((output) => inputFiles.includes(path.resolve(/** @type {string} */(outputs[output].entryPoint)))) || outputFiles[0];
                    }
                    await entrypoint.finisher(outputFile, outputFiles);
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
