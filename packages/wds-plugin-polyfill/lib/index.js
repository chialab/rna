import polyfillLibrary from 'polyfill-library';

/** @typedef {Partial<import('polyfill-library').Config>} Config */

const DEFAULT_FEATURES = {
    'es6': {},
    'URL': {},
    'URL.prototype.toJSON': {},
    'URLSearchParams': {},
    'Promise': {},
    'Promise.prototype.finally': {},
    'fetch': {},
};

const POLYFILLED = '_polyfilled';

/**
 * Inject polyfill loader into another plugin.
 * This is useful in combination with the dev server legacy plugin.
 * @param {import('@web/dev-server-core').Plugin} plugin
 * @param {Config} config
 */
export function inject(plugin, config) {
    const originalTransform = plugin.transform;
    plugin.transform = async function transform(context) {
        if (originalTransform) {
            await originalTransform.call(this, context);
        }
        if (!context.response.is('html') || context[POLYFILLED]) {
            return;
        }
        const features = config.features || DEFAULT_FEATURES;
        if (!Object.keys(features).length) {
            return;
        }

        context[POLYFILLED] = true;

        const consolePolyfill = 'console.log=console.log.bind(console);';
        const code = await polyfillLibrary.getPolyfillString({
            uaString: context.get('user-agent'),
            ...config,
            features,
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
 * @param {Config} config
 */
export function polyfillPlugin(config = {}) {
    /**
     * @type {import('@web/dev-server-core').Plugin}
     */
    const plugin = {
        name: 'polyfill',
    };
    inject(plugin, config);

    return plugin;
}
