import { createRequire } from 'module';
import { checkEsmSupport } from './checkEsmSupport.js';
import { readFile } from './readFile.js';
import $ from './esm-cheerio.js';

const require = createRequire(import.meta.url);

/**
 * @param {string} content Code to transform.
 * @param {import('@web/dev-server-core').Context} context
 */
async function transform(content, context) {
    const { transformAsync } = await import('@babel/core');
    const { default: env } = await import('@babel/preset-env');
    const { default: system } = await import('@babel/plugin-transform-modules-systemjs');
    /**
     * @type {import('@babel/core').PluginItem[]}
     */
    const presets = [];
    /**
     * @type {import('@babel/core').PluginItem[]}
     */
    const plugins = [];
    if (!context.url.includes('core-js')) {
        presets.push([env, {
            targets: ['ie 10'],
            bugfixes: true,
            ignoreBrowserslistConfig: true,
            shippedProposals: true,
            modules: 'systemjs',
        }]);
    } else {
        plugins.push(system);
    }
    const result = await transformAsync(content, {
        sourceMaps: 'inline',
        babelrc: false,
        compact: false,
        presets,
        plugins,
    });
    if (!result) {
        return content;
    }
    return /** @type {string} */ (result.code);
}

/**
 * Convert esm modules to the SystemJS module format.
 * It also transpiles source code using babel.
 */
export function legacyPlugin() {
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
                context.body = await transform(body, context);
                return;
            }
            if (context.response.is('html')) {
                const body = /** @type {string} */ (context.body);
                const dom = $.load(body);
                const root = dom.root();

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

                context.body = dom.html();
            }
        },
    };

    return plugin;
}
