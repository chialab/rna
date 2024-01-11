import { Buffer } from 'buffer';
import crypto from 'crypto';
import { createRequire } from 'module';
import { createHelperUrl, isPlainScript } from '@chialab/wds-plugin-node-resolve';
import { inject } from '@chialab/wds-plugin-polyfill';
import * as cheerio from 'cheerio';
import { checkEsmSupport } from './checkEsmSupport.js';
import { readFile } from './readFile.js';
import { transform } from './transform.js';

const require = createRequire(import.meta.url);

/**
 * Cheerio esm support is unstable for some Node versions.
 */
const load = /** typeof cheerio.load */ cheerio.load || cheerio.default?.load;

/**
 * Create an hash for the given buffer.
 * @param {Buffer|Uint8Array|string} buffer The buffer input.
 * @returns A buffer hash.
 */
function hash(buffer) {
    const hash = crypto.createHash('sha1');
    hash.update(Buffer.from(buffer));
    return hash.digest('hex').substring(0, 8);
}

/**
 * Convert esm modules to the SystemJS module format.
 * It also transpiles source code using babel.
 * @param {import('@chialab/wds-plugin-polyfill').Config} config
 */
export function legacyPlugin(config = {}) {
    const systemUrl = require.resolve('systemjs/dist/s.min.js');
    const systemHelper = createHelperUrl('system.js');
    const regeneratorUrl = require.resolve('regenerator-runtime/runtime.js');
    const regeneratorHelper = createHelperUrl('runtime.js');

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
            return checkEsmSupport(context) ? undefined : 'legacy';
        },

        async serve(context) {
            if (inlineScripts.has(context.path)) {
                return {
                    body: /** @type {string} */ (inlineScripts.get(context.path)),
                };
            }
            if (context.path === systemHelper) {
                return {
                    body: `${await readFile(systemUrl)}

var createScript = System.constructor.prototype.createScript;
System.constructor.prototype.createScript = function (url) {
    if (url.indexOf('?') === -1) {
        url += '?type=module';
    } else {
        url += '&type=module';
    }
    return createScript.call(this, url);
};
`,
                };
            }
            if (context.path === regeneratorHelper) {
                return {
                    body: await readFile(regeneratorUrl),
                };
            }
        },

        async transform(context) {
            if (checkEsmSupport(context) || isPlainScript(context)) {
                return;
            }
            if (context.path === systemHelper || context.path === regeneratorHelper) {
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
                        $script.text(`window.import('${src.startsWith('/') ? src : `./${src}`}');`);
                    } else {
                        const content = $script.html() || '';
                        const src = `/script-${hash(content)}.js`;
                        inlineScripts.set(src, content);
                        $script.text(`window.import('${src}');`);
                    }
                }

                const head = root.find('head') || root.find('body');
                head.prepend(
                    '<script>(function() { var p = Promise.resolve(); window.import = function(source) { return p = p.then(function() { return System.import(source) }); }}());</script>'
                );
                head.prepend(`<script src="${systemHelper}"></script>`);
                head.prepend(`<script src="${regeneratorHelper}"></script>`);

                context.body = $.html();
            }
        },
    };

    inject(plugin, config);

    return plugin;
}
