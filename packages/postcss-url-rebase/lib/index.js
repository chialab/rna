import path from 'path';
import { styleResolve, isRelativeUrl, createAliasRegex, ALIAS_MODE } from '@chialab/node-resolve';

/**
 * @typedef {Object} UrlRebasePluginOptions
 * @property {string} [root] The root dir of the build.
 * @property {boolean} [relative] Should use relative paths.
 * @property {import('@chialab/node-resolve').AliasMap} [alias] A list of alias.
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
                    /**
                     * @type {import('@chialab/node-resolve').AliasMap}
                     */
                    const aliases = {
                        ...alias,
                    };
                    external.forEach((ext) => {
                        delete aliases[ext];
                    });
                    for (const key in aliases) {
                        const aliasFilter = createAliasRegex(key, ALIAS_MODE.START);
                        if (resolvedImportPath.match(aliasFilter)) {
                            const aliasValue = aliases[key];
                            const aliased = typeof aliasValue === 'function' ?
                                aliasValue(inputFile) :
                                aliasValue;

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

                decl.params = `url('${resolvedImportPath}')`;
            },
        },
    };

    return plugin;
}
