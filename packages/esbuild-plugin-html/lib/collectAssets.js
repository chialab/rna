import { isRelativeUrl } from '@chialab/node-resolve';

/**
 * Collect and bundle each node with a src reference.
 * @type {import('./index').Collector}
 */
export async function collectAssets($, dom) {
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
                finisher(files) {
                    $(element).attr('src', files[0]);
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
                finisher(files) {
                    $(element).attr('href', files[0]);
                },
            })),
    ];
}
