import { readFile } from 'fs/promises';
import { styleResolve } from '@chialab/node-resolve';

/**
 * Create a scoped SASS resolver.
 * @param {string} rootDir
 */
export default function(rootDir) {
    /**
     * Resolve the file path of an imported style.
     * @type {import('sass').Importer<'async'>}
     */
    const nodeResolver = {
        async canonicalize(url) {
            if (url.match(/^(~|package:)/)) {
                // some modules use ~ or package: for node_modules import
                url = url.replace(/^(~|package:)/, '');
            }

            const splitted = url.split('/');
            if (splitted.length === 1 || (url[0] === '@' && splitted.length === 2)) {
                // resolve using `style` field.
                url = await styleResolve(url, rootDir) || url;
            }

            if (!url) {
                return null;
            }

            // return the found url.
            return new URL(url);
        },
        async load(canonicalUrl) {
            return {
                contents: await readFile(canonicalUrl.href, 'utf8'),
                syntax: 'scss',
            };
        },
    };

    return nodeResolver;
}
