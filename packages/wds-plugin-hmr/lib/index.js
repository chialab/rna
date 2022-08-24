import { mergePluginHooks } from '@chialab/es-dev-server';
import { hmrLoaderPlugin } from './hmrLoaderPlugin.js';
import { hmrCssPlugin } from './hmrCssPlugin.js';

export { hmrLoaderPlugin, hmrCssPlugin };

/**
 * Create a server plugin for hmr.
 * @returns A server plugin.
 */
export function hmrPlugin() {
    const basePlugin = hmrLoaderPlugin();
    const baseCssPlugin = hmrCssPlugin();

    /**
     * @type {import('@web/dev-server-core').Plugin}
     */
    const plugin = {
        name: 'hmr',
        injectWebSocket: true,

        ...mergePluginHooks(basePlugin, baseCssPlugin),
    };

    return plugin;
}
