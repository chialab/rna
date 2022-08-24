import { hmrPlugin as createBaseHmrPlugin } from '@web/dev-server-hmr';

/**
 * Create a server plugin that injects hmr.js module.
 * @returns A server plugin.
 */
export function hmrLoader() {
    const baseHmrPlugin = createBaseHmrPlugin();

    /**
     * @type {import('@web/dev-server-core').Plugin}
     */
    const plugin = {
        name: 'hmr-loader',

        serverStart: baseHmrPlugin.serverStart,
        resolveImport: baseHmrPlugin.resolveImport,
        serve: baseHmrPlugin.serve,

        async transform(context) {
            if (context.path === '/__web-dev-server__web-socket.js') {
                return `${context.body}\n;import('/__web-dev-server__/hmr.js');`;
            }

            return baseHmrPlugin.transform && baseHmrPlugin.transform(context);
        },
    };

    return plugin;
}
