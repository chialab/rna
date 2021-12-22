import path from 'path';
import { readFile } from 'fs/promises';
import { styleResolve } from '@chialab/node-resolve';

/**
 * Generate a list of file paths with all style extensions.
 * @param {string} url
 * @return {string[]}
 */
export function alternatives(url) {
    const results = path.extname(url) ?
        // url already has an extension.
        [url] :
        // remap the path with all style extensions.
        ['.css', '.scss', '.sass'].map((ext) => `${url}${ext}`);

    // look for sass partials too.
    if (path.basename(url)[0] !== '_') {
        for (let i = 0, len = results.length; i < len; i++) {
            results.push(
                // add the _ for partial syntax
                path.join(
                    path.dirname(results[i]),
                    `_${path.basename(results[i])}`
                )
            );
        }
    }

    return results;
}

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
            } else {
                return null;
            }

            if (!url) {
                return null;
            }

            // return the found url.
            return new URL(`file://${url}`);
        },
        async load(canonicalUrl) {
            return {
                contents: await readFile(canonicalUrl.pathname, 'utf8'),
                syntax: 'scss',
            };
        },
    };

    return nodeResolver;
}
