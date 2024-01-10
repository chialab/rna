import path from 'path';
import process from 'process';
import { styleResolve, isRelativeUrl } from '@chialab/node-resolve';

/**
 * @typedef {Object} UrlRebasePluginOptions
 * @property {string} [root] The root dir of the build.
 * @property {boolean} [relative] Should use relative paths.
 * @property {Record<string, string>} [alias] A list of alias.
 * @property {string[]} [external] A list of references to ignore.
 * @property {(filePath: string, decl: import('postcss').AtRule) => string|void|Promise<string|void>} [transform] A transform function for the import.
 */

/**
 * A postcss plugin for url() rebasing before import.
 * @param {UrlRebasePluginOptions} options
 */
export default function urlRebase({ root = process.cwd(), relative, transform, alias = {}, external = [] } = {}) {
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

                /**
                 * @type {string|null}
                 */
                let resolvedImportPath = source
                    .replace(/^['"]/, '')
                    .replace(/['"]$/, '')
                    .replace(/^~/, '');

                if (!isRelativeUrl(resolvedImportPath)) {
                    return;
                }

                const inputFile = decl.source?.input.file ?? root;

                if (!resolvedImportPath.startsWith('.')) {
                    const aliases = {
                        ...alias,
                    };
                    for (const ext of external) {
                        if (resolvedImportPath === ext || resolvedImportPath.startsWith(`${ext}/`)) {
                            return;
                        }
                        delete aliases[ext];
                    }
                    for (const key in aliases) {
                        const aliasFilter = new RegExp(`(^|\\/)${key.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(\\/|$)`);
                        if (resolvedImportPath.match(aliasFilter)) {
                            const aliased = aliases[key];
                            if (!aliased) {
                                return;
                            }

                            resolvedImportPath = aliased;
                            break;
                        }
                    }
                    resolvedImportPath = await styleResolve(resolvedImportPath, inputFile);
                }

                if (!resolvedImportPath) {
                    return;
                }

                if (path.extname(resolvedImportPath) !== '.css') {
                    return;
                }

                if (transform) {
                    resolvedImportPath = await transform(resolvedImportPath, decl) || resolvedImportPath;
                } else if (relative && decl.source?.input.file && path.isAbsolute(resolvedImportPath)) {
                    resolvedImportPath = `./${path.relative(decl.source.input.file, resolvedImportPath)}`;
                }

                if (match) {
                    decl.params = `url('${resolvedImportPath}')`;
                } else {
                    decl.params = `'${resolvedImportPath}'`;
                }
            },
        },
    };

    return plugin;
}
