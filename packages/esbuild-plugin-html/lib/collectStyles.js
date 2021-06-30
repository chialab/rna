import path from 'path';
import $ from './esm-cheerio.js';

/**
 * Collect and bundle each <link> reference.
 * @param {import('./esm-cheerio').Document} dom The DOM element.
 * @param {string} base The base dir.
 * @param {string} outdir The output dir.
 * @param {import('esbuild').BuildOptions} options Build options.
 * @return {import('./index').Entrypoint[]} A list of entrypoints.
 */
export function collectStyles(dom, base, outdir, options) {
    return [
        ...dom
            .find('link[href][rel="stylesheet"]')
            .get()
            .filter((element) => $(element).attr('href'))
            .map((element) => ({
                loader: /** @type {import('esbuild').Loader} */ ('css'),
                options: {
                    entryPoints: [
                        path.resolve(base, /** @type {string} */ ($(element).attr('href'))),
                    ],
                    entryNames: `css/${options.entryNames || '[name]'}`,
                    chunkNames: `css/${options.chunkNames || '[name]'}`,
                    assetNames: `css/assets/${options.assetNames || '[name]'}`,
                },
                /**
                 * @param {string} filePath
                 */
                finisher(filePath) {
                    $(element).attr('href', path.relative(outdir, filePath));
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
                     * @param {string} filePath
                     */
                    finisher(filePath) {
                        $(element).text(`@import url('${path.relative(outdir, filePath)}');`);
                    },
                };
            }),
    ];
}
