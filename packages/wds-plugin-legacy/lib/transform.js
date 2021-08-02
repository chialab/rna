/**
 * Transform code using Babel
 * @param {string} content Code to transform.
 * @param {string} url The requested url.
 */
export async function babelTransform(content, url) {
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
    if (!url.includes('core-js')) {
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
        sourceMaps: false,
        babelrc: false,
        compact: false,
        sourceType: 'module',
        presets,
        plugins,
    });
    if (!result) {
        return content;
    }
    return /** @type {string} */ (result.code);
}

/**
 * Memoize Babel transform.
 */
export function memoTransform() {
    /**
     * @type {{ [key: string]: Promise<string> }}
     */
    const cache = {};

    /**
     * @type {typeof babelTransform}
     */
    const memo = async (content, url) => {
        cache[url] = cache[url] || babelTransform(content, url);
        return await cache[url];
    };

    return memo;
}

/**
 * Memoized Babel transform.
 */
export const transform = memoTransform();
