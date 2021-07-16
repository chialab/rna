import path from 'path';
import { styleResolve } from '@chialab/node-resolve';

/**
 * @typedef {Object} UrlRebasePluginOptions
 * @property {string} [root] The root dir of the build.
 * @property {boolean} [relative] Should use relative paths.
 */

/**
 * A postcss plugin for url() rebasing before import.
 * @param {UrlRebasePluginOptions} options
 */
export default function urlRebase({ root = process.cwd(), relative } = {}) {
    relative = typeof relative === 'boolean' ? relative : true;

    /**
     * @type {import('postcss').Plugin}
     */
    const plugin = {
        postcssPlugin: 'postcss-rebase',
        AtRule: {
            async import(decl) {
                const match = decl.params.match(/url\(['"]?(.*?)['"]?\)/);
                if (!match || !match[1]) {
                    return;
                }

                const source = match[1].replace(/^~/, '');
                if (source.startsWith('.') ||
                    source.startsWith('/') ||
                    source.startsWith('http:') ||
                    source.startsWith('https:')) {
                    return;
                }

                const resolvedImportPath = await styleResolve(source, decl.source?.input.file ?? root);
                if (path.extname(resolvedImportPath) !== '.css') {
                    return;
                }

                const filePath = (decl.source?.input.file && relative) ? `./${path.relative(decl.source.input.file, resolvedImportPath)}` : resolvedImportPath;
                decl.params = `url('${filePath}')`;
            },
        },
    };

    return plugin;
}
