import path from 'path';
import $ from './esm-cheerio.js';

/**
 * Collect and bundle each node with a src reference.
 * @param {import('./esm-cheerio').Document} dom The DOM element.
 * @param {string} base The base dir.
 * @param {string} outdir The output dir.
 * @return {import('./index').Entrypoint[]} A list of entrypoints.
 */
export function collectAssets(dom, base, outdir) {
    return [
        ...dom
            .find('[src]:not(script)')
            .get()
            .filter((element) => $(element).attr('src'))
            .map((element) => ({
                loader: /** @type {import('esbuild').Loader} */ ('file'),
                options: {
                    entryPoints: [
                        path.resolve(base, /** @type {string} */ ($(element).attr('src'))),
                    ],
                    entryNames: 'assets/[name]-[hash]',
                    chunkNames: 'assets/[name]-[hash]',
                    assetNames: 'assets/[name]-[hash]',
                },
                /**
                 * @param {string} filePath
                 */
                finisher(filePath) {
                    $(element).attr('src', path.relative(outdir, filePath));
                },
            })),
        ...dom
            .find('link[href]:not([rel="stylesheet"]):not([rel="manifest"]):not([rel*="icon"]), a[download][href], iframe[href]')
            .get()
            .filter((element) => $(element).attr('href'))
            .map((element) => ({
                loader: /** @type {import('esbuild').Loader} */ ('file'),
                options: {
                    entryPoints: [
                        path.resolve(base, /** @type {string} */ ($(element).attr('href'))),
                    ],
                    entryNames: 'assets/[name]-[hash]',
                    chunkNames: 'assets/[name]-[hash]',
                    assetNames: 'assets/[name]-[hash]',
                },
                /**
                 * @param {string} filePath
                 */
                finisher(filePath) {
                    $(element).attr('href', path.relative(outdir, filePath));
                },
            })),
    ];
}
