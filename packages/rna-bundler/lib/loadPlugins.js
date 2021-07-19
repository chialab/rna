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
     * @type {Promise<import('esbuild').Plugin>[]}
     */
    const transformPlugins = [
        import('@chialab/esbuild-plugin-webpack-include').then(({ default: plugin }) => plugin()),
        import('@chialab/esbuild-plugin-commonjs').then(({ default: plugin }) => plugin({
            ...commonjs,
        })),
    ];

    try {
        transformPlugins.push(loadBabelPlugin(babel));
    } catch (err) {
        //
    }

    return Promise.all(transformPlugins);
}

/**
 * @param {{ html?: import('@chialab/esbuild-plugin-html').PluginOptions, postcss?: import('@chialab/esbuild-plugin-postcss').PluginOptions }} options
 * @param {typeof import('esbuild')} [esbuild]
 * @returns
 */
export async function loadPlugins({ html, postcss } = {}, esbuild) {
    /**
     * @type {Promise<import('esbuild').Plugin>[]}
     */
    const plugins = [];

    if (html) {
        try {
            plugins.push(
                import('@chialab/esbuild-plugin-html').then(({ default: plugin }) => plugin(html, esbuild)));
        } catch (err) {
            //
        }
    }

    if (postcss) {
        try {
            plugins.push(
                import('@chialab/esbuild-plugin-postcss').then(({ default: plugin }) => plugin(postcss))
            );
        } catch (err) {
            //
        }
    }

    return Promise.all(plugins);
}
