import path from 'path';
import glob from 'fast-glob';
import { MagicString, getSpanLocation, parse, walk } from '@chialab/estransform';
import { useRna } from '@chialab/esbuild-rna';

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
            const { onTransform } = useRna(build);

            onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, async (args) => {
                if (!args.code.includes('module.hot.decline') &&
                    !args.code.includes('webpackInclude:')) {
                    return;
                }

                /**
                 * @type {MagicString|undefined}
                 */
                let magicCode;

                /**
                 * @type {Promise<void>[]}
                 */
                const promises = [];

                const ast = await parse(args.code);
                walk(ast, {
                    /**
                     * @param {import('@chialab/estransform').CallExpression} node
                     */
                    CallExpression(node) {
                        if (node.callee.type !== 'Identifier' ||
                            node.callee.value !== 'import') {
                            return;
                        }

                        const firstArg = node.arguments[0] && node.arguments[0].expression;
                        if (firstArg.type !== 'TemplateLiteral') {
                            return;
                        }

                        const comments = (/** @type {typeof node & { trailingComments: string[] }} */ (node)).trailingComments;
                        const included = comments.find((value) => value.startsWith('webpackInclude:'));
                        if (!included) {
                            return;
                        }

                        const excluded = comments.find((value) => value.startsWith('webpackExclude:'));
                        const include = new RegExp(included.replace('webpackInclude:', '').trim().replace(/^\//, '').replace(/\/$/, ''));
                        const exclude = excluded && new RegExp(excluded.replace('webpackExclude:', '').trim().replace(/^\//, '').replace(/\/$/, ''));
                        const initial = firstArg.quasis[0].raw.value;
                        const identifier = firstArg.expressions[0].type === 'Identifier' && firstArg.expressions[0].value;

                        const loc = getSpanLocation(ast, node);
                        magicCode = magicCode || new MagicString(args.code);

                        promises.push((async () => {
                            const map = (await glob(`${initial}*`, {
                                cwd: path.dirname(args.path),
                            }))
                                .filter((name) => name.match(include) && (!exclude || !name.match(exclude)))
                                .reduce((map, name) => {
                                    map[name.replace(include, '')] = `./${path.join(initial, name)}`;
                                    return map;
                                }, /** @type {{ [key: string]: string }} */({}));

                            magicCode.overwrite(loc.start, loc.end, `({ ${Object.keys(map).map((key) => `'${key}': () => import('${map[key]}')`).join(', ')} })[${identifier}]()`);
                        })());
                    },

                    /**
                     * @param {import('@chialab/estransform').IfStatement} node
                     */
                    IfStatement(node) {
                        if (node.test.type !== 'BinaryExpression' ||
                            node.test.left.type !== 'BinaryExpression' ||
                            node.test.left.left.type !== 'Identifier' ||
                            node.test.left.left.value !== 'module' ||
                            node.test.left.right.type !== 'MemberExpression' ||
                            node.test.left.right.object.type !== 'Identifier' ||
                            node.test.left.right.object.value !== 'module' ||
                            node.test.left.right.property.type !== 'Identifier' ||
                            node.test.left.right.property.value !== 'hot' ||
                            node.test.right.type !== 'MemberExpression' ||
                            node.test.right.object.type !== 'MemberExpression' ||
                            node.test.right.object.object.type !== 'Identifier' ||
                            node.test.right.object.object.value !== 'module' ||
                            node.test.right.object.property.type !== 'Identifier' ||
                            node.test.right.object.property.value !== 'hot' ||
                            node.test.right.property.type !== 'Identifier' ||
                            node.test.right.property.value !== 'decline'
                        ) {
                            return;
                        }

                        const loc = getSpanLocation(ast, node);
                        magicCode = magicCode || new MagicString(args.code);
                        magicCode.overwrite(loc.start, loc.end, '');
                    },
                });

                await Promise.all(promises);

                if (!magicCode) {
                    return;
                }

                return {
                    code: magicCode.toString(),
                    map: magicCode.generateMap({
                        source: args.path,
                        includeContent: sourcesContent,
                        hires: true,
                    }),
                };
            });
        },
    };

    return plugin;
}
