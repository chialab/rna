export async function loadBabelPlugin() {
    try {
        return (await import('@chialab/esbuild-plugin-swc')).default();
    } catch (err) {
        //
    }

    return (await import('@chialab/esbuild-plugin-babel')).default();
}

export async function loadTransformPlugins() {
    /**
     * @type {import('esbuild').Plugin[]}
     */
    const transformPlugins = [];

    try {
        transformPlugins.push(await loadBabelPlugin());
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
