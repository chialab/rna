import { mergePluginHooks } from '@chialab/es-dev-server';
import { hmrPlugin as createBaseHmrPlugin } from '@chialab/wds-plugin-hmr';
import { hmrDnaPlugin } from './hmrDnaPlugin.js';

/**
 * Create dna hmr plugin.
 * @returns HMR plugin.
 */
export function hmrPlugin() {
    const baseHmrPlugin = createBaseHmrPlugin();

    /**
     * @type {import('@chialab/es-dev-server').Plugin}
     */
    const plugin = {
        name: 'dna-hmr',
        injectWebSocket: true,

        ...mergePluginHooks(baseHmrPlugin, hmrDnaPlugin()),
    };

    return plugin;
}
