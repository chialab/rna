import path from 'path';
import $ from 'cheerio';

/**
 * Collect and bundle each <script> reference.
 * @param {import('cheerio').Cheerio<import('cheerio').Document>} dom The DOM element.
 * @param {string} base The base dir.
 * @param {string} outdir The output dir.
 * @param {import('esbuild').BuildOptions} options Build options.
 * @return {import('./index').Entrypoint[]} A list of entrypoints.
 */
export function collectScripts(dom, base, outdir, targets = { scriptsTarget: 'es6', modulesTarget: 'es2020' }, options) {
    return [
        ...dom.find('script[src][type="module"]')
            .get()
            .filter((element) => $(element).attr('src'))
            .map((element) => ({
                options: {
                    entryPoints: [
                        path.resolve(base, /** @type {string} */ ($(element).attr('src'))),
                    ],
                    target: targets.modulesTarget,
                    format: /** @type {import('esbuild').Format} */ ('esm'),
                    entryNames: `esm/${options.entryNames || '[name]'}`,
                    chunkNames: `esm/${options.chunkNames || '[name]'}`,
                    assetNames: `esm/assets/${options.assetNames || '[name]'}`,
                },
                /**
                 * @param {string} filePath
                 */
                finisher(filePath) {
                    $(element).attr('src', path.relative(outdir, filePath));
                },
            })),
        ...dom.find('script[type="module"]:not([src])')
            .get()
            .map((element) => {
                const code = /** @type {string} */ ($(element).html());
                $(element).html('');

                return {
                    loader: /** @type {import('esbuild').Loader} */ ('tsx'),
                    options: {
                        entryPoints: undefined,
                        stdin: {
                            contents: code,
                            loader: /** @type {import('esbuild').Loader} */ ('tsx'),
                            resolveDir: base,
                            sourcefile: path.join(base, 'inline.tsx'),
                        },
                        target: targets.modulesTarget,
                        format: /** @type {import('esbuild').Format} */ ('esm'),
                        entryNames: `esm/${options.entryNames || '[name]'}`,
                        chunkNames: `esm/${options.chunkNames || '[name]'}`,
                        assetNames: `esm/assets/${options.assetNames || '[name]'}`,
                    },
                    /**
                     * @param {string} filePath
                     */
                    finisher(filePath) {
                        $(element).attr('src', path.relative(outdir, filePath));
                    },
                };
            }),
        ...dom.find('script[src]:not([type]), script[src][type="text/javascript"], script[src][type="application/javascript"]')
            .get()
            .filter((element) => $(element).attr('src'))
            .map((element) => ({
                options: {
                    entryPoints: [
                        path.resolve(base, /** @type {string} */ ($(element).attr('src'))),
                    ],
                    target: targets.scriptsTarget,
                    format: /** @type {import('esbuild').Format} */ ('iife'),
                    entryNames: `iife/${options.entryNames || '[name]'}`,
                    chunkNames: `iife/${options.chunkNames || '[name]'}`,
                    assetNames: `iife/assets/${options.assetNames || '[name]'}`,
                    splitting: false,
                },
                /**
                 * @param {string} filePath
                 */
                finisher(filePath) {
                    $(element).attr('src', path.relative(outdir, filePath));
                },
            })),
        ...dom.find('script:not([src]):not([type]), script[type="text/javascript"]:not([src]), script[type="application/javascript"]:not([src])')
            .get()
            .map((element) => {
                const code = /** @type {string} */ ($(element).html());
                $(element).html('');

                return {
                    loader: /** @type {import('esbuild').Loader} */ ('tsx'),
                    options: {
                        entryPoints: undefined,
                        stdin: {
                            contents: code,
                            loader: /** @type {import('esbuild').Loader} */ ('tsx'),
                            resolveDir: base,
                            sourcefile: path.join(base, 'inline.tsx'),
                        },
                        target: targets.scriptsTarget,
                        format: /** @type {import('esbuild').Format} */ ('iife'),
                        globalName: undefined,
                        entryNames: `iife/${options.entryNames || '[name]'}`,
                        chunkNames: `iife/${options.chunkNames || '[name]'}`,
                        assetNames: `iife/assets/${options.assetNames || '[name]'}`,
                        splitting: false,
                    },
                    /**
                     * @param {string} filePath
                     */
                    finisher(filePath) {
                        $(element).attr('src', path.relative(outdir, filePath));
                    },
                };
            }),
    ];
}
