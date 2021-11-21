import path from 'path';
import { isRelativeUrl } from '@chialab/node-resolve';

/**
 * Collect and bundle each node with a src reference.
 * @type {import('./index').Collector}
 */
export async function collectAssets($, dom, options) {
    return [
        ...dom
            .find('[src]:not(script)')
            .get()
            .filter((element) => isRelativeUrl($(element).attr('src')))
            .map((element) => /** @type {import('./index.js').CollectResult} */ ({
                build: {
                    entryPoint: /** @type {string} */ ($(element).attr('src')),
                    loader: /** @type {import('esbuild').Loader} */ ('file'),
                },
                finisher(outputFiles) {
                    $(element).attr('src', path.relative(options.outDir, outputFiles[0].path));
                },
            })),
        ...dom
            .find('link[href]:not([rel="stylesheet"]):not([rel="manifest"]):not([rel*="icon"]):not([rel*="apple-touch-startup-image"]), a[download][href], iframe[href]')
            .get()
            .filter((element) => isRelativeUrl($(element).attr('href')))
            .map((element) => /** @type {import('./index.js').CollectResult} */ ({
                build: {
                    entryPoint: /** @type {string} */ ($(element).attr('href')),
                    loader: /** @type {import('esbuild').Loader} */ ('file'),
                },
                finisher(outputFiles) {
                    $(element).attr('href', path.relative(options.outDir, outputFiles[0].path));
                },
            })),
    ];
}
