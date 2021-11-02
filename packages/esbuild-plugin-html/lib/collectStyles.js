import path from 'path';
import { isRelativeUrl } from '@chialab/node-resolve';

/**
 * Collect and bundle each <link> reference.
 * @param {import('cheerio').CheerioAPI} $ The cheerio selector.
 * @param {import('cheerio').Cheerio<import('cheerio').Document>} dom The DOM element.
 * @param {string} base The base dir.
 * @param {string} outdir The output dir.
 * @param {import('esbuild').BuildOptions} options Build options.
 * @return {import('./index').Build[]} A list of builds.
 */
export function collectStyles($, dom, base, outdir, options) {
    return [
        ...dom
            .find('link[href][rel="stylesheet"]')
            .get()
            .filter((element) => isRelativeUrl($(element).attr('href')))
            .map((element) => ({
                loader: /** @type {import('esbuild').Loader} */ ('css'),
                options: {
                    entryPoints: [
                        /** @type {string} */ ($(element).attr('href')),
                    ],
                    entryNames: `css/${options.entryNames || '[name]'}`,
                    chunkNames: `css/${options.chunkNames || '[name]'}`,
                    assetNames: `css/assets/${options.assetNames || '[name]'}`,
                },
                /**
                 * @param {string[]} outputFiles
                 */
                finisher(outputFiles) {
                    $(element).attr('href', path.relative(outdir, outputFiles[0]));
                },
            })),
        ...dom
            .find('style')
            .get()
            .map((element) => {
                const code = /** @type {string} */ ($(element).html());
                return {
                    loader: /** @type {import('esbuild').Loader} */ ('css'),
                    options: {
                        entryPoints: undefined,
                        stdin: {
                            contents: code,
                            loader: /** @type {import('esbuild').Loader} */ ('css'),
                            resolveDir: base,
                            sourcefile: path.join(base, 'inline.css'),
                        },
                        entryNames: `css/${options.entryNames || '[name]'}`,
                        chunkNames: `css/${options.chunkNames || '[name]'}`,
                        assetNames: `css/assets/${options.assetNames || '[name]'}`,
                    },
                    /**
                     * @param {string[]} outputFiles
                     */
                    finisher(outputFiles) {
                        $(element).text(`@import url('${path.relative(outdir, outputFiles[0])}');`);
                    },
                };
            }),
    ];
}
