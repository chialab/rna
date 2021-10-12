import { hmrPlugin as webHmrPlugin } from '@web/dev-server-hmr';

/**
 * @typedef {(path: string, module: any, needsReplacement: boolean) => void} SetNeedsReplacement
 */

/**
 * @typedef {ReturnType<typeof webHmrPlugin> & { _setNeedsReplacement: SetNeedsReplacement }} HmrPlugin
 */

/**
 *
 * @returns
 */
export function hmrPlugin() {
    const plugin = /** @type {HmrPlugin} */ (webHmrPlugin());
    const original = plugin._setNeedsReplacement;

    /**
     * I did not find any reason why the needs replacement flag
     * of a changed module should be resetted, so I am going to ignore reset requests
     * since it causes bugs when a module is referenced across multiple files.
     * @type {SetNeedsReplacement}
     */
    plugin._setNeedsReplacement = function(path, module, needsReplacement) {
        if (!needsReplacement) {
            return;
        }

        original.call(this, path, module, needsReplacement);
    };

    return plugin;
}
