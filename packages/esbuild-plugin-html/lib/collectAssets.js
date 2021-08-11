import path from "path";
import { collect } from "./collect.js";

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
        ...collect($, dom, "[src]:not(script)", "src").map((element) => ({
            loader: /** @type {import('esbuild').Loader} */ ("file"),
            options: {
                entryPoints: [
                    path.resolve(
                        base,
                        /** @type {string} */ ($(element).attr("src"))
                    ),
                ],
                entryNames: `assets/${options.entryNames || "[name]"}`,
                chunkNames: `assets/${options.chunkNames || "[name]"}`,
                assetNames: `assets/${options.assetNames || "[name]"}`,
            },
            /**
             * @param {string} filePath
             */
            finisher(filePath) {
                $(element).attr("src", path.relative(outdir, filePath));
            },
        })),
        ...collect(
            $,
            dom,
            'link[href]:not([rel="stylesheet"]):not([rel="manifest"]):not([rel*="icon"]), a[download][href], iframe[href]',
            "href"
        ).map((element) => ({
            loader: /** @type {import('esbuild').Loader} */ ("file"),
            options: {
                entryPoints: [
                    path.resolve(
                        base,
                        /** @type {string} */ ($(element).attr("href"))
                    ),
                ],
                entryNames: `assets/${options.entryNames || "[name]"}`,
                chunkNames: `assets/${options.chunkNames || "[name]"}`,
                assetNames: `assets/${options.assetNames || "[name]"}`,
            },
            /**
             * @param {string} filePath
             */
            finisher(filePath) {
                $(element).attr("href", path.relative(outdir, filePath));
            },
        })),
    ];
}
