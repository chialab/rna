import { hmrPlugin as createBaseHmrPlugin } from '@web/dev-server-hmr';

/**
 * Create a server plugin that injects hmr.js module.
 * @returns A server plugin.
 */
export function hmrPlugin() {
    const baseHmrPlugin = createBaseHmrPlugin();

    /**
     * @type {import('@web/dev-server-core').Plugin}
     */
    const plugin = {
        name: 'hmr',
        injectWebSocket: true,

        serverStart(args) {
            return baseHmrPlugin.serverStart && baseHmrPlugin.serverStart(args);
        },

        resolveImport(args) {
            return baseHmrPlugin.resolveImport && baseHmrPlugin.resolveImport(args);
        },

        serve(context) {
            return baseHmrPlugin.serve && baseHmrPlugin.serve(context);
        },

        async transform(context) {
            if (context.path === '/__web-dev-server__web-socket.js') {
                return `${context.body}\n;import('/__web-dev-server__/hmr.js');`;
            }

            return baseHmrPlugin.transform && baseHmrPlugin.transform(context);
        },
    };

    return plugin;
}
