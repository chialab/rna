import path from 'path';
import glob from 'fast-glob';
import { pipe, walk, getOffsetFromLocation, parseComments } from '@chialab/estransform';
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
                        ImportExpression(node) {
                            if (node.source.type !== 'TemplateLiteral') {
                                return;
                            }

                            const chunk = code.substr(node.start, node.end - node.start);
                            const comments = parseComments(chunk);
                            const included = comments.find((value) => value.startsWith('webpackInclude:'));
                            if (!included) {
                                return;
                            }

                            const excluded = comments.find((value) => value.startsWith('webpackExclude:'));
                            const include = new RegExp(included.replace('webpackInclude:', '').trim().replace(/^\//, '').replace(/\/$/, ''));
                            const exclude = excluded && new RegExp(excluded.replace('webpackExclude:', '').trim().replace(/^\//, '').replace(/\/$/, ''));
                            const initial = node.source.quasis[0].value.raw;
                            const identifier = node.source.expressions[0].name;

                            promises.push((async () => {
                                const map = (await glob(`${initial}*`, {
                                    cwd: path.dirname(args.path),
                                }))
                                    .filter((name) => name.match(include) && (!exclude || !name.match(exclude)))
                                    .reduce((map, name) => {
                                        map[name.replace(include, '')] = `./${path.join(initial, name)}`;
                                        return map;
                                    }, /** @type {{ [key: string]: string }} */({}));

                                const startOffset = getOffsetFromLocation(code, node.loc.start);
                                const endOffset = getOffsetFromLocation(code, node.loc.end);
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
