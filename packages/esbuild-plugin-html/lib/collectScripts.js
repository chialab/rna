import path from 'path';
import $ from 'cheerio';

/**
 * Collect and bundle each <script> reference.
 * @param {$.Cheerio} dom The DOM element.
 * @param {string} base The base dir.
 * @param {string} outdir The output dir.
 * @return {import('./index').Entrypoint[]} A list of entrypoints.
 */
export function collectScripts(dom, base, outdir, targets = { scriptsTarget: 'es6', modulesTarget: 'es2020' }) {
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
                    entryNames: 'esm/[name]-[hash]',
                    chunkNames: 'esm/[name]-[hash]',
                    assetNames: 'esm/assets/[name]-[hash]',
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
                let code = /** @type {string} */ ($(element).html());
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
                        entryNames: 'esm/[name]-[hash]',
                        chunkNames: 'esm/[name]-[hash]',
                        assetNames: 'esm/assets/[name]-[hash]',
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
                    entryNames: 'iife/[name]-[hash]',
                    chunkNames: 'iife/[name]-[hash]',
                    assetNames: 'iife/assets/[name]-[hash]',
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
                let code = /** @type {string} */ ($(element).html());
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
                        entryNames: 'iife/[name]-[hash]',
                        chunkNames: 'iife/[name]-[hash]',
                        assetNames: 'iife/assets/[name]-[hash]',
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
