import path from 'node:path';
import { styleResolve } from '@chialab/node-resolve';

/**
 * Generate a list of file paths with all style extensions.
 * @param {string} url
 * @returns {string[]}
 */
export function alternatives(url) {
    const results = path.extname(url)
        ? // url already has an extension.
          [url]
        : // remap the path with all style extensions.
          ['.css', '.scss', '.sass'].map((ext) => `${url}${ext}`);

    // look for sass partials too.
    if (path.basename(url)[0] !== '_') {
        for (let i = 0, len = results.length; i < len; i++) {
            results.push(
                // add the _ for partial syntax
                path.join(path.dirname(results[i]), `_${path.basename(results[i])}`)
            );
        }
    }

    return results;
}

/**
 * Create a scoped SASS resolver.
 * @param {string} rootDir
 */
export default function (rootDir) {
    /**
     * Resolve the file path of an imported style.
     * @param {string} url
     * @param {string} prev
     * @param {(options: { file: string } | null) => void} done
     * @return {void}
     */
    const nodeResolver = (url, prev, done) => {
        if (url.match(/^(~|package:)/)) {
            // some modules use ~ or package: for node_modules import
            return nodeResolver(url.replace(/^(~|package:)/, ''), prev, done);
        }

        const splitted = url.split('/');
        if (splitted.length === 1 || (url[0] === '@' && splitted.length === 2)) {
            // resolve using `style` field.
            styleResolve(url, prev ? path.dirname(prev) : rootDir)
                .then((file) => file || url)
                .then((file) => {
                    done({ file });
                });
        } else {
            done(null);
        }
    };

    return nodeResolver;
}
