import { promises } from 'fs';
import postcss from 'postcss';
import preset from '@chialab/postcss-preset-chialab';
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
        let result = await postcssrc();
        return result;
    } catch {
        //
    }

    return {};
}

/**
 * Instantiate a plugin that runs postcss across css files.
 * @return An esbuild plugin.
 */
export function postcssPlugin(opts = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'postcss',
        setup(build) {
            build.onLoad({ filter: /\.css$/, namespace: 'file' }, async ({ path: filePath }) => {
                let contents = await readFile(filePath, 'utf-8');
                let options = await loadPostcssConfig();
                let plugins = (options.plugins || [
                    preset(),
                ]);

                let config = {
                    from: filePath,
                    map: true,
                    ...(options.options || {}),
                    ...opts,
                };
                let result = await postcss(plugins).process(contents, config);

                return {
                    contents: result.css.toString(),
                    loader: 'css',
                };
            });
        },
    };

    return plugin;
}
