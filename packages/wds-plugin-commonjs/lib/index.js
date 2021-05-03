import { getRequestFilePath } from '@web/dev-server-core';
import { transform, ESM_KEYWORDS, CJS_KEYWORDS } from '@chialab/cjs-to-esm';

/**
 * Create a server plugin instance that converts cjs modules to esm.
 * @return A server plugin.
 */
export function commonjsPlugin() {
    /**
     * @type {import('@web/dev-server-core').DevServerCoreConfig}
     */
    let config;
    let rootDir = '';

    /**
     * @type {import('@web/dev-server-core').Plugin}
     */
    const plugin = {
        name: 'commonjs',
        async serverStart(args) {
            config = args.config;
            rootDir = config.rootDir;
        },
        async transform(context) {
            if (context.response.is('js')) {
                const filePath = getRequestFilePath(context.url, rootDir);
                const body = /** @type {string} */ (context.body);
                if (body.match(ESM_KEYWORDS) || !body.match(CJS_KEYWORDS)) {
                    return;
                }
                return { body: transform(body, { source: filePath, sourceMap: 'inline' }).code };
            }
        },
    };

    return plugin;
}
