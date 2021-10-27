import path from 'path';
import glob from 'fast-glob';
import { pipe, walk, getOffsetFromLocation, parseComments } from '@chialab/estransform';
import { getEntry, finalizeEntry, createFilter, transformError } from '@chialab/esbuild-plugin-transform';

/**
 * Remove webpack features from sources.
 * @return An esbuild plugin.
 */
export default function() {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'unwebpack',
        setup(build) {
            const { sourcesContent } = build.initialOptions;

            build.onLoad({ filter: createFilter(build), namespace: 'file' }, async (args) => {
                /**
                 * @type {import('@chialab/estransform').Pipeline}
                 */
                const entry = args.pluginData || await getEntry(build, args.path);
                if (!entry.code.includes('module.hot.decline') &&
                    !entry.code.includes('webpackInclude:')) {
                    return;
                }

                try {
                    await pipe(entry, {
                        source: path.basename(args.path),
                        sourcesContent,
                    }, async (data) => {
                        /**
                         * @type {Promise<void>[]}
                         */
                        const promises = [];

                        walk(data.ast, {
                            /**
                             * @param {*} node
                             */
                            ImportExpression(node) {
                                if (node.source.type !== 'TemplateLiteral') {
                                    return;
                                }

                                const chunk = data.code.substr(node.start, node.end - node.start);
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

                                    const startOffset = getOffsetFromLocation(data.code, node.loc.start);
                                    const endOffset = getOffsetFromLocation(data.code, node.loc.end);
                                    data.magicCode.overwrite(
                                        startOffset,
                                        endOffset,
                                        `({ ${Object.keys(map).map((key) => `'${key}': () => import('${map[key]}')`).join(', ')} })[${identifier}]()`
                                    );
                                })());
                            },

                            /**
                             * @param {*} node
                             */
                            IfStatement(node) {
                                if (node.test.type !== 'LogicalExpression' ||
                                    node.test.left.type !== 'LogicalExpression' ||
                                    node.test.left.left.type !== 'Identifier' ||
                                    node.test.left.left.name !== 'module' ||
                                    node.test.left.right.type !== 'MemberExpression' ||
                                    node.test.left.right.object.type !== 'Identifier' ||
                                    node.test.left.right.object.name !== 'module' ||
                                    node.test.left.right.property.type !== 'Identifier' ||
                                    node.test.left.right.property.name !== 'hot' ||
                                    node.test.right.type !== 'MemberExpression' ||
                                    node.test.right.object.type !== 'MemberExpression' ||
                                    node.test.right.object.object.type !== 'Identifier' ||
                                    node.test.right.object.object.name !== 'module' ||
                                    node.test.right.object.property.type !== 'Identifier' ||
                                    node.test.right.object.property.name !== 'hot' ||
                                    node.test.right.property.type !== 'Identifier' ||
                                    node.test.right.property.name !== 'decline'
                                ) {
                                    return;
                                }

                                const startOffset = getOffsetFromLocation(data.code, node.loc.start);
                                const endOffset = getOffsetFromLocation(data.code, node.loc.end);
                                data.magicCode.overwrite(startOffset, endOffset, '');
                            },
                        });

                        await Promise.all(promises);
                    });
                } catch (error) {
                    throw transformError(this.name, error);
                }

                return finalizeEntry(build, args.path);
            });
        },
    };

    return plugin;
}
