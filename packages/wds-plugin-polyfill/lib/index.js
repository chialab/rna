import polyfillLibrary from 'polyfill-library';

/**
 * @param {import('polyfill-library').Config} config
 */
export function polyfillPlugin(config = { features: {}}) {
    /**
     * @type {import('@web/dev-server-core').Plugin}
     */
    const plugin = {
        name: 'polyfill',
        async transform(context) {
            if (!context.response.is('html')) {
                return;
            }
            if (!Object.keys(config.features).length) {
                return;
            }
            const code = await polyfillLibrary.getPolyfillString({
                uaString: context.get('user-agent'),
                ...config,
            });
            const body = /** @type {string} */ (context.body);
            if (body.includes('<head>')) {
                context.body = body.replace('<head>', () => `<head><script>${code}</script>`);
            } else if (body.includes('<body>')) {
                context.body = body.replace('<body>', () => `<body><script>${code}</script>`);
            } else {
                context.body = `<script>${code}</script>${body}`;
            }
        },
    };

    return plugin;
}
