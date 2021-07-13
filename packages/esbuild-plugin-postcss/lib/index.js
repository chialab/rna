import { promises } from 'fs';
import postcss from 'postcss';
import preset from '@chialab/postcss-preset-chialab';
import urlRebase from '@chialab/postcss-url-rebase';
import postcssrc from 'postcss-load-config';

const { readFile } = promises;

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
 * @typedef {import('postcss').ProcessOptions & { relative?: boolean }} PluginOptions
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
        setup(build) {
            build.onLoad({ filter: /\.css$/, namespace: 'file' }, async ({ path: filePath }) => {
                const contents = await readFile(filePath, 'utf-8');
                const config = await loadPostcssConfig();
                const plugins = [
                    urlRebase({ root: build.initialOptions.sourceRoot, relative: options.relative }),
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
