/**
 * @typedef {Object} PostcssConfig
 * @property {import('postcss').ProcessOptions} [options]
 * @property {import('postcss').Plugin[]} [plugins]
 */

/**
 * Load local postcss config.
 * @return {Promise<PostcssConfig>}
 */
async function loadPostcssConfig() {
    const { default: postcssrc } = await import('postcss-load-config');
    try {
        /**
         * @type {any}
         */
        const result = await postcssrc();
        return result;
    } catch {
        //
    }

    return {};
}

/**
 * @typedef {import('@chialab/postcss-url-rebase').UrlRebasePluginOptions} UrlRebasePluginOptions
 */

/**
 * @typedef {import('postcss').ProcessOptions & { relative?: UrlRebasePluginOptions['relative'], transform?: UrlRebasePluginOptions['transform'] }} PluginOptions
 */

/**
 * Instantiate a plugin that runs postcss across css files.
 * @param {PluginOptions} options
 * @return An esbuild plugin.
 */
export default function(options = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'postcss',
        async setup(build) {
            const { sourceRoot } = build.initialOptions;

            build.onLoad({ filter: /\.css$/, namespace: 'file' }, async ({ path: filePath }) => {
                const [
                    { promises: { readFile } },
                    { default: postcss },
                    { default: preset },
                    { default: urlRebase },
                ] = await Promise.all([
                    import('fs'),
                    import('postcss'),
                    import('@chialab/postcss-preset-chialab'),
                    import('@chialab/postcss-url-rebase'),
                ]);

                const contents = await readFile(filePath, 'utf-8');
                const config = await loadPostcssConfig();
                const plugins = [
                    urlRebase({
                        root: sourceRoot,
                        relative: options.relative,
                        transform: options.transform,
                    }),
                    ...(config.plugins || [preset()]),
                ];

                const finalConfig = {
                    from: filePath,
                    map: true,
                    ...(config.options || {}),
                    ...options,
                };
                const result = await postcss(plugins).process(contents, finalConfig);

                return {
                    contents: result.css.toString(),
                    loader: 'css',
                };
            });
        },
    };

    return plugin;
}
