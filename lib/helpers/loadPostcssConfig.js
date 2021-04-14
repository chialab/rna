import postcssrc from 'postcss-load-config';

/**
 * @typedef {Object} PostcssConfig
 * @property {import('postcss').ProcessOptions} [options]
 * @property {import('postcss').Plugin[]} [plugins]
 */

/**
 * Load local postcss config.
 * @return {Promise<PostcssConfig>}
 */
export async function loadPostcssConfig() {
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
