/**
 * @param {{ commonjs?: import('@chialab/esbuild-plugin-commonjs').PluginOptions, babel?: import('@chialab/esbuild-plugin-babel').PluginOptions }} [config]
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
    ];

    if (commonjs) {
        transformPlugins.push(
            import('@chialab/esbuild-plugin-commonjs').then(({ default: plugin }) => plugin({
                ...commonjs,
            }))
        );
    }

    if (babel) {
        transformPlugins.push(
            import('@chialab/esbuild-plugin-babel')
                .catch(() => {
                    throw new Error(`Cannot import the "@chialab/esbuild-plugin-babel" plugin.
Did you foget to install it? Please run:

npm i -D @chialab/esbuild-plugin-babel
yarn add -D @chialab/esbuild-plugin-babel
`);
                })
                .then(({ default: plugin }) => plugin({
                    ...babel,
                }))
        );
    }

    return /** @type {import('esbuild').Plugin[]} */ ((await Promise.all(transformPlugins)).filter((plugin) => !!plugin));
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

    return /** @type {import('esbuild').Plugin[]} */ ((await Promise.all(plugins)).filter((plugin) => !!plugin));
}
