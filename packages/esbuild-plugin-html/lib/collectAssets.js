import path from 'path';
import { isRelativeUrl } from '@chialab/node-resolve';

/**
 * Collect and bundle each node with a src reference.
 * @param {import('cheerio').CheerioAPI} $ The cheerio selector.
 * @param {import('cheerio').Cheerio<import('cheerio').Document>} dom The DOM element.
 * @param {string} base The base dir.
 * @param {string} outdir The output dir.
 * @param {import('esbuild').BuildOptions} options Build options.
 * @return {import('./index').Build[]} A list of builds.
 */
export function collectAssets($, dom, base, outdir, options) {
    return [
        ...dom
            .find('[src]:not(script)')
            .get()
            .filter((element) => isRelativeUrl($(element).attr('src')))
            .map((element) => ({
                loader: /** @type {import('esbuild').Loader} */ ('file'),
                options: {
                    entryPoints: [
                        path.resolve(base, /** @type {string} */ ($(element).attr('src'))),
                    ],
                    entryNames: `assets/${options.entryNames || '[name]'}`,
                    chunkNames: `assets/${options.chunkNames || '[name]'}`,
                    assetNames: `assets/${options.assetNames || '[name]'}`,
                },
                /**
                 * @param {string[]} outputFiles
                 */
                finisher(outputFiles) {
                    $(element).attr('src', path.relative(outdir, outputFiles[0]));
                },
            })),
        ...dom
            .find('link[href]:not([rel="stylesheet"]):not([rel="manifest"]):not([rel*="icon"]), a[download][href], iframe[href]')
            .get()
            .filter((element) => isRelativeUrl($(element).attr('href')))
            .map((element) => ({
                loader: /** @type {import('esbuild').Loader} */ ('file'),
                options: {
                    entryPoints: [
                        path.resolve(base, /** @type {string} */ ($(element).attr('href'))),
                    ],
                    entryNames: `assets/${options.entryNames || '[name]'}`,
                    chunkNames: `assets/${options.chunkNames || '[name]'}`,
                    assetNames: `assets/${options.assetNames || '[name]'}`,
                },
                /**
                 * @param {string[]} outputFiles
                 */
                finisher(outputFiles) {
                    $(element).attr('href', path.relative(outdir, outputFiles[0]));
                },
            })),
    ];
}
