import MagicString from 'magic-string';
import { createFilter } from 'vite';

/**
 * @typedef {import('vite').FilterPattern} FilterPattern
 * @typedef {import('vite').Plugin} Plugin
 */

/**
 * @typedef {Object} CssModulesPluginOptions
 * @property {boolean} [checkAttribute=true] - Whether to check for type="css" attribute
 * @property {FilterPattern} [include='**\/*.{js,jsx,ts,tsx}'] - Files to include
 * @property {FilterPattern} [exclude] - Files to exclude
 */

/**
 * Creates a Vite plugin for CSS modules
 * @param {CssModulesPluginOptions} [options={}] - Plugin configuration options
 * @returns {Plugin[]} Array of Vite plugins
 */
export default function cssModulesPlugin({ checkAttribute = true, include = '**/*.{js,jsx,ts,tsx}', exclude } = {}) {
    const filter = createFilter(include, exclude);
    let isBuild = false;

    return [
        {
            name: 'vite-plugin-css-modules-pre',

            enforce: 'pre',

            configResolved(config) {
                isBuild = config.command === 'build';
            },

            resolveId: {
                filter: {
                    id: /\.css$/,
                },
                async handler(id, importer, options) {
                    if (!filter(importer)) {
                        return null;
                    }
                    if (checkAttribute && options.attributes?.type !== 'css') {
                        return null;
                    }

                    const resolved = await this.resolve(id, importer, { ...options, skipSelf: true });
                    if (!resolved || resolved.external) {
                        return null;
                    }

                    return `${resolved.id}?inline&vite-plugin-css-modules`;
                },
            },

            handleHotUpdate({ modules }) {
                const modulesToInvalidate = modules.filter((mod) => mod.id?.endsWith('vite-plugin-css-modules'));
                return modulesToInvalidate.length ? modulesToInvalidate : undefined;
            },
        },
        {
            name: 'vite-plugin-css-modules-post',

            enforce: 'post',

            transform: {
                filter: {
                    id: /vite-plugin-css-modules$/,
                },
                async handler(code) {
                    const magic = new MagicString(code);
                    magic.replace(/^export default /, 'const css = ');
                    magic.append(`;
const sheet = ${!isBuild ? 'import.meta.hot?.data?.sheet ?? ' : ''}(typeof document !== 'undefined' && 'adoptedStyleSheets' in document ? new CSSStyleSheet() : null);
sheet?.replaceSync(css);
${
    !isBuild
        ? `
if (import.meta.hot) {
    import.meta.hot.data.sheet = sheet;
    import.meta.hot.accept();
}
`
        : ''
}
export default sheet ?? css;`);
                    return {
                        code: magic.toString(),
                        map: magic.generateMap({ hires: true }),
                    };
                },
            },
        },
    ];
}
