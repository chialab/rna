import path from 'path';
import { parse } from '@chialab/estransform';
import { getRequestFilePath } from '@chialab/es-dev-server';
import { hmrPlugin as baseHmrPlugin } from '@chialab/wds-plugin-hmr';
import { patch } from './patch.js';
import { containsComponent } from './utils.js';

/**
 * Create a server plugin that injects hmr.js module.
 * @returns A server plugin.
 */
export function hmrPlugin() {
    const basePlugin = baseHmrPlugin();

    /**
     * @type {string}
     */
    let rootDir;

    /**
     * @type {import('@web/dev-server-core').Plugin}
     */
    const plugin = {
        name: 'dna-hmr',

        async serverStart(args) {
            if (basePlugin.serverStart) {
                await basePlugin.serverStart(args);
            }

            rootDir = args.config.rootDir;
        },

        async serverStop() {
            if (basePlugin.serverStop) {
                await basePlugin.serverStop();
            }
        },

        resolveImport(args) {
            if (args.source === '/__web-dev-server__/hmr-dna.js') {
                return args.source;
            }

            return basePlugin.resolveImport && basePlugin.resolveImport(args);
        },

        serve(context) {
            if (context.path === '/__web-dev-server__/hmr-dna.js') {
                return patch;
            }

            return basePlugin.serve && basePlugin.serve(context);
        },

        async transform(context) {
            const body = /** @type {string} */ (context.body);
            if (context.response.is('js') && containsComponent(body)) {
                const filePath = getRequestFilePath(context.url, rootDir);
                const { helpers } = await parse(body, path.basename(filePath));
                helpers.append(`import '/__web-dev-server__/hmr-dna.js';
if (import.meta.hot) {
    import.meta.hot.accept();
}`);
                const { code } = await helpers.generate({
                    sourcemap: 'inline',
                    sourcesContent: true,
                });

                context.body = code;
            }

            return basePlugin.transform && basePlugin.transform(context);
        },

        transformCacheKey(context) {
            return basePlugin.transformCacheKey && basePlugin.transformCacheKey(context);
        },

        transformImport(args) {
            return basePlugin.transformImport && basePlugin.transformImport(args);
        },
    };

    return plugin;
}
