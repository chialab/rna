import path from 'path';
import { styleResolve } from '@chialab/node-resolve';

/**
 * @typedef {Object} UrlRebasePluginOptions
 * @property {string} [root] The root dir of the build.
 * @property {boolean} [relative] Should use relative paths.
 * @property {(filePath: string, decl: import('postcss').AtRule) => string|void|Promise<string|void>} [transform] A transform function for the import.
 */

/**
 * A postcss plugin for url() rebasing before import.
 * @param {UrlRebasePluginOptions} options
 */
export default function urlRebase({ root = process.cwd(), relative, transform } = {}) {
    relative = typeof relative === 'boolean' ? relative : true;

    /**
     * @type {import('postcss').Plugin}
     */
    const plugin = {
        postcssPlugin: 'postcss-rebase',
        AtRule: {
            async import(decl) {
                const match = decl.params.match(/url\((['"]?.*?['"])?\)/);
                const source = match ? match[1] : decl.params;
                if (!source) {
                    return;
                }

                let resolvedImportPath = source
                    .replace(/^['"]/, '')
                    .replace(/['"]$/, '')
                    .replace(/^~/, '');
                if (resolvedImportPath.startsWith('http:') || resolvedImportPath.startsWith('https:')) {
                    return;
                }

                if (!resolvedImportPath.startsWith('.') && !resolvedImportPath.startsWith('/')) {
                    resolvedImportPath = await styleResolve(resolvedImportPath, decl.source?.input.file ?? root);
                }

                if (path.extname(resolvedImportPath) !== '.css') {
                    return;
                }

                if (transform) {
                    resolvedImportPath = await transform(resolvedImportPath, decl) || resolvedImportPath;
                } else {
                    resolvedImportPath = (decl.source?.input.file && relative && path.isAbsolute(resolvedImportPath)) ? `./${path.relative(decl.source.input.file, resolvedImportPath)}` : resolvedImportPath;
                }

                decl.params = `url('${resolvedImportPath}')`;
            },
        },
    };

    return plugin;
}
