import { createRequire } from 'module';
import { inject } from '@chialab/wds-plugin-polyfill';
import { checkEsmSupport } from './checkEsmSupport.js';
import { readFile } from './readFile.js';
import { transform } from './transform.js';
import { load } from 'cheerio';

const require = createRequire(import.meta.url);

/**
 * Convert esm modules to the SystemJS module format.
 * It also transpiles source code using babel.
 * @param {import('@chialab/wds-plugin-polyfill').Config} config
 */
export function legacyPlugin(config = {}) {
    const systemUrl = require.resolve('systemjs/dist/s.min.js');
    const regeneratorUrl = require.resolve('regenerator-runtime/runtime.js');

    /**
     * @type {Map<string, string>}
     */
    const inlineScripts = new Map();

    /**
     * @type {import('@web/dev-server-core').Plugin}
     */
    const plugin = {
        name: 'legacy',

        transformCacheKey(context) {
            return checkEsmSupport(context.get('user-agent')) ? undefined : 'legacy';
        },

        async serve(context) {
            if (inlineScripts.has(context.path)) {
                return {
                    body: /** @type {string} */ (inlineScripts.get(context.path)),
                };
            }
            if (context.path === '/system.js' ||
                context.path === '/regenerator-runtime.js') {
                return { body: '' };
            }
        },

        async transform(context) {
            const ua = context.get('user-agent');
            if (checkEsmSupport(ua)) {
                return;
            }
            if (context.path === '/regenerator-runtime.js') {
                context.body = await readFile(regeneratorUrl);
                return;
            }
            if (context.path === '/system.js') {
                context.body = await readFile(systemUrl);
                return;
            }
            if (context.response.is('js')) {
                const body = /** @type {string} */ (context.body);
                context.body = await transform(body, context.url);
                return;
            }
            if (context.response.is('html')) {
                const body = /** @type {string} */ (context.body);
                const $ = load(body);
                const root = $.root();

                const scripts = root.find('script[type="module"]');
                for (let i = 0; i < scripts.length; i++) {
                    const $script = $(scripts[i]);
                    $script.removeAttr('type');
                    $script.attr('defer', '');
                    $script.attr('async', '');
                    if ($script.attr('src')) {
                        const src = $script.attr('src');
                        if (!src) {
                            continue;
                        }
                        const url = new URL(src, 'http://localhost');
                        if (url.host !== 'localhost') {
                            continue;
                        }
                        $script.removeAttr('src');
                        $script.text(`window.import('${src}');`);
                    } else {
                        const content = $script.html() || '';
                        const src = `/script-${inlineScripts.size}.js`;
                        inlineScripts.set(src, content);
                        $script.text(`window.import('${src}');`);
                    }
                }

                const head = root.find('head') || root.find('body');
                head.prepend('<script>(function() { var p = Promise.resolve(); window.import = function(source) { return p = p.then(function() { return System.import(source) }); }}());</script>');
                head.prepend('<script src="/system.js"></script>');
                head.prepend('<script src="/regenerator-runtime.js"></script>');

                context.body = $.html();
            }
        },
    };

    inject(plugin, config);

    return plugin;
}
