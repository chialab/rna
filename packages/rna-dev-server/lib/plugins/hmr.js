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

    /**
     * Disable the modified flag for a request
     * since it causes bugs when a module is referenced across multiple files.
     * @type {SetNeedsReplacement}
     */
    plugin._setNeedsReplacement = function() {};

    return plugin;
}
