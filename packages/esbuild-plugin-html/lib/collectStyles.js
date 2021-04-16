import path from 'path';
import $ from 'cheerio';

/**
 * Collect and bundle each <link> reference.
 * @param {$.Cheerio} dom The DOM element.
 * @param {string} base The base dir.
 * @param {string} outdir The output dir.
 * @return {import('./index').Entrypoint[]} A list of entrypoints.
 */
export function collectStyles(dom, base, outdir) {
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
                    entryNames: 'css/[name]-[hash]',
                    chunkNames: 'css/[name]-[hash]',
                    assetNames: 'css/assets/[name]-[hash]',
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
                let code = /** @type {string} */ ($(element).html());
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
                        entryNames: 'css/[name]-[hash]',
                        chunkNames: 'css/[name]-[hash]',
                        assetNames: 'css/assets/[name]-[hash]',
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
