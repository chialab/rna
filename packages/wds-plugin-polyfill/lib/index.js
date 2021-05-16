import polyfillLibrary from 'polyfill-library';

/**
 * Inject polyfill loader into another plugin.
 * This is useful in combination with the dev server legacy plugin.
 * @param {import('@web/dev-server-core').Plugin} plugin
 * @param {import('polyfill-library').Config} config
 */
export function inject(plugin, config) {
    const originalTransform = plugin.transform;
    plugin.transform = async function transform(context) {
        if (originalTransform) {
            await originalTransform.call(this, context);
        }
        if (!context.response.is('html')) {
            return;
        }
        if (!Object.keys(config.features).length) {
            return;
        }
        const consolePolyfill = 'console.log=console.log.bind(console);';
        const code = await polyfillLibrary.getPolyfillString({
            uaString: context.get('user-agent'),
            ...config,
        });
        const body = /** @type {string} */ (context.body);
        if (body.includes('<head>')) {
            context.body = body.replace('<head>', () => `<head><script>${consolePolyfill}${code}</script>`);
        } else if (body.includes('<body>')) {
            context.body = body.replace('<body>', () => `<body><script>${consolePolyfill}${code}</script>`);
        } else {
            context.body = `<script>${consolePolyfill}${code}</script>${body}`;
        }
    };
}

/**
 * @param {import('polyfill-library').Config} config
 */
export function polyfillPlugin(config = { features: {}}) {
    /**
     * @type {import('@web/dev-server-core').Plugin}
     */
    const plugin = {
        name: 'polyfill',
    };
    inject(plugin, config);

    return plugin;
}
