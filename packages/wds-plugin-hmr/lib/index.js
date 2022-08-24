import { hmrLoader } from './hmrLoader.js';
import { hmrCss } from './hmrCss.js';

export { hmrLoader, hmrCss };

/**
 * Create a server plugin for hmr.
 * @returns A server plugin.
 */
export function hmrPlugin() {
    const baseHmrPlugin = hmrLoader();
    const baseCssHmr = hmrCss();

    /**
     * @type {import('@web/dev-server-core').Plugin}
     */
    const plugin = {
        name: 'hmr',
        injectWebSocket: true,

        async serverStart(args) {
            if (baseHmrPlugin.serverStart) {
                await baseHmrPlugin.serverStart(args);
            }
            if (baseCssHmr.serverStart) {
                await baseCssHmr.serverStart(args);
            }
        },

        async serve(context) {
            if (baseHmrPlugin.serve) {
                return baseHmrPlugin.serve(context);
            }
        },

        async resolveImport(args) {
            if (baseHmrPlugin.resolveImport) {
                return baseHmrPlugin.resolveImport(args);
            }
        },

        async transform(context) {
            let result;
            if (baseCssHmr.transform) {
                result = await baseCssHmr.transform(context);
            }
            if (result == null && baseHmrPlugin.transform) {
                result = await baseHmrPlugin.transform(context);
            }

            return result;
        },
    };

    return plugin;
}
