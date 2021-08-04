/**
 * @param {{ metaUrl?: import('@chialab/esbuild-plugin-meta-url').PluginOptions, worker?: import('@chialab/esbuild-plugin-meta-url').PluginOptions, commonjs?: import('@chialab/esbuild-plugin-commonjs').PluginOptions }} [config]
 */
export async function loadTransformPlugins({
    metaUrl = {},
    worker = {},
    commonjs = {},
} = {}) {
    /**
     * @type {Promise<import('@chialab/rna-config-loader').Plugin>[]}
     */
    const transformPlugins = [
        import('@chialab/esbuild-plugin-webpack-include').then(({ default: plugin }) => plugin()),
        import('@chialab/esbuild-plugin-commonjs').then(({ default: plugin }) => plugin({
            ...commonjs,
        })),
        import('@chialab/esbuild-plugin-worker').then(({ default: plugin }) => plugin({
            ...worker,
        })),
        import('@chialab/esbuild-plugin-meta-url').then(({ default: plugin }) => plugin({
            ...metaUrl,
        })),
    ];

    return Promise.all(transformPlugins);
}

/**
 * @param {{ html?: import('@chialab/esbuild-plugin-html').PluginOptions, postcss?: import('@chialab/esbuild-plugin-postcss').PluginOptions }} options
 * @param {typeof import('esbuild')} [esbuild]
 */
export async function loadPlugins({ html, postcss } = {}, esbuild) {
    /**
     * @type {Promise<import('esbuild').Plugin|false>[]}
     */
    const plugins = [];

    if (html) {
        plugins.push(
            import('@chialab/esbuild-plugin-html')
                .then(({ default: plugin }) => plugin(html, esbuild))
                .catch(() => false)
        );
    }

    if (postcss) {
        plugins.push(
            import('@chialab/esbuild-plugin-postcss')
                .then(({ default: plugin }) => plugin(postcss))
                .catch(() => false)
        );
    }

    return /** @type {import('@chialab/rna-config-loader').Plugin[]} */ ((await Promise.all(plugins)).filter((plugin) => !!plugin));
}
