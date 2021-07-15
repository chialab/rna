/**
 * @typedef {import('@chialab/esbuild-plugin-babel').PluginOptions|import('@chialab/esbuild-plugin-swc').PluginOptions} BabelOptions
 */

/**
 * @param {BabelOptions} [config]
 * @returns
 */
export async function loadBabelPlugin(config) {
    try {
        return (await import('@chialab/esbuild-plugin-swc')).default(
            /** @type {import('@chialab/esbuild-plugin-swc').PluginOptions} */(config || {})
        );
    } catch (err) {
        //
    }

    return (await import('@chialab/esbuild-plugin-babel')).default(
        /** @type {import('@chialab/esbuild-plugin-babel').PluginOptions} */(config || {})
    );
}

/**
 * @param {{ commonjs?: import('@chialab/esbuild-plugin-commonjs').PluginOptions, babel?: BabelOptions }} [config]
 */
export async function loadTransformPlugins({
    commonjs,
    babel,
} = {}) {
    /**
     * @type {import('esbuild').Plugin[]}
     */
    const transformPlugins = [
        (await import('@chialab/esbuild-plugin-commonjs')).default({
            ...commonjs,
        }),
        (await import('@chialab/esbuild-plugin-require-resolve')).default(),
        (await import('@chialab/esbuild-plugin-webpack-include')).default(),
    ];

    try {
        transformPlugins.push(await loadBabelPlugin(babel));
    } catch (err) {
        //
    }

    return transformPlugins;
}

/**
 * @param {{ html?: import('@chialab/esbuild-plugin-html').PluginOptions, postcss?: import('@chialab/esbuild-plugin-postcss').PluginOptions }} options
 * @returns
 */
export async function loadPlugins({ html, postcss } = {}) {
    /**
     * @type {import('esbuild').Plugin[]}
     */
    const plugins = [];

    if (html) {
        try {
            plugins.push((await import('@chialab/esbuild-plugin-html')).default(html));
        } catch (err) {
            //
        }
    }

    if (postcss) {
        try {
            plugins.push((await import('@chialab/esbuild-plugin-postcss')).default(postcss));
        } catch (err) {
            //
        }
    }

    return plugins;
}
