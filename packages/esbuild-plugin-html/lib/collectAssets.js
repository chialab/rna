import path from 'path';
import { isRelativeUrl } from '@chialab/node-resolve';

/**
 * Collect and bundle each node with a src reference.
 * @param {import('cheerio').CheerioAPI} $ The cheerio selector.
 * @param {import('cheerio').Cheerio<import('cheerio').Document>} dom The DOM element.
 * @param {string} base The base dir.
 * @param {string} outdir The output dir.
 * @return {import('./index').CollectResult[]} A list of builds.
 */
export function collectAssets($, dom, base, outdir) {
    return [
        ...dom
            .find('[src]:not(script)')
            .get()
            .filter((element) => isRelativeUrl($(element).attr('src')))
            .map((element) => ({
                build: {
                    entryPoint: path.resolve(base, /** @type {string} */ ($(element).attr('src'))),
                    loader: /** @type {import('esbuild').Loader} */ ('file'),
                },
                /**
                 * @param {import('esbuild').OutputFile[]} outputFiles
                 */
                finisher(outputFiles) {
                    $(element).attr('src', path.relative(outdir, outputFiles[0].path));
                },
            })),
        ...dom
            .find('link[href]:not([rel="stylesheet"]):not([rel="manifest"]):not([rel*="icon"]):not([rel*="apple-touch-startup-image"]), a[download][href], iframe[href]')
            .get()
            .filter((element) => isRelativeUrl($(element).attr('href')))
            .map((element) => ({
                build: {
                    entryPoint: path.resolve(base, /** @type {string} */ ($(element).attr('href'))),
                    loader: /** @type {import('esbuild').Loader} */ ('file'),
                },
                /**
                 * @param {import('esbuild').OutputFile[]} outputFiles
                 */
                finisher(outputFiles) {
                    $(element).attr('href', path.relative(outdir, outputFiles[0].path));
                },
            })),
    ];
}
