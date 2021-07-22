import path from 'path';
import glob from 'fast-glob';
import { pipe, walk, getOffsetFromLocation } from '@chialab/estransform';
import { getEntry, finalizeEntry, createFilter } from '@chialab/esbuild-plugin-transform';

/**
 * A plugin that converts the `webpackInclude` syntax.
 * @return An esbuild plugin.
 */
export default function() {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'webpack-include',
        setup(build) {
            const options = build.initialOptions;

            build.onLoad({ filter: createFilter(build), namespace: 'file' }, async (args) => {
                /**
                 * @type {import('@chialab/estransform').Pipeline}
                 */
                const entry = args.pluginData || await getEntry(build, args.path);
                if (!entry.code.includes('webpackInclude:')) {
                    return;
                }

                await pipe(entry, {
                    source: path.basename(args.path),
                    sourcesContent: options.sourcesContent,
                }, async ({ ast, magicCode, code }) => {
                    /**
                     * @type {Promise<void>[]}
                     */
                    const promises = [];

                    walk(ast, {
                        /**
                         * @param {*} node
                         */
                        CallExpression(node) {
                            if (!node.callee || node.callee.type !== 'ImportExpression') {
                                return;
                            }

                            if (node.arguments.length !== 1 ||
                                node.arguments[0].type !== 'TemplateLiteral' ||
                                !node.arguments[0].leadingComments ||
                                !node.arguments[0].leadingComments.length) {
                                return;
                            }

                            const comments = node.arguments[0].leadingComments;
                            const included = comments.find(
                                /**
                                 * @param {*} param0
                                 * @returns
                                 */
                                ({ value }) => value.startsWith('webpackInclude:')
                            );
                            if (!included) {
                                return;
                            }

                            promises.push((async () => {
                                const excluded = comments.find(
                                    /**
                                     * @param {*} param0
                                     * @returns
                                     */
                                    ({ value }) => value.startsWith('webpackExclude:')
                                );
                                const include = new RegExp(included.replace('webpackInclude:', '').trim());
                                const exclude = excluded && new RegExp(excluded.replace('webpackExclude:', '').trim());
                                const initial = node.arguments[0].quasis[0].value.raw;
                                const identifier = node.arguments[0].expressions[0].name;
                                const map = (await glob(`${initial}*`, {
                                    cwd: path.dirname(args.path),
                                }))
                                    .filter((name) => name.match(include) && (!exclude || !name.match(exclude)))
                                    .reduce((map, name) => {
                                        map[name.replace(include, '')] = `./${path.join(initial, name)}`;
                                        return map;
                                    }, /** @type {{ [key: string]: string }} */({}));

                                const startOffset = getOffsetFromLocation(code, node.loc.start.line, node.loc.start.column);
                                const endOffset = getOffsetFromLocation(code, node.loc.end.line, node.loc.end.column);
                                magicCode.overwrite(
                                    startOffset,
                                    endOffset,
                                    `({ ${Object.keys(map).map((key) => `'${key}': () => import('${map[key]}')`).join(', ')} })[${identifier}]()`
                                );
                            })());
                        },
                    });

                    await Promise.all(promises);
                });

                return finalizeEntry(build, args.path);
            });
        },
    };

    return plugin;
}
