import path from 'node:path';
import { useRna } from '@chialab/esbuild-rna';
import { parse, walk } from '@chialab/estransform';
import glob from 'fast-glob';

/**
 * Remove webpack features from sources.
 * @returns An esbuild plugin.
 */
export default function () {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'unwebpack',
        setup(pluginBuild) {
            const build = useRna(plugin, pluginBuild);
            const { sourcesContent, sourcemap } = build.getOptions();
            const workingDir = build.getWorkingDir();

            build.onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, async (args) => {
                const code = args.code;

                if (
                    !code.includes('module.hot') &&
                    !code.includes('import.meta.webpackHot') &&
                    !code.includes('webpackInclude:')
                ) {
                    return;
                }

                const {
                    ast,
                    comments: programComments,
                    helpers,
                } = await parse(code, path.relative(workingDir, args.path));
                await walk(ast, {
                    async ImportExpression(node) {
                        if (!node.source || node.source.type !== 'TemplateLiteral') {
                            return;
                        }

                        const argument = node.source;
                        /**
                         * @type {import('@chialab/estransform').Node[]}
                         */
                        const comments = programComments.filter(
                            /** @param {import('@chialab/estransform').Node} comment */ (comment) => {
                                if (comment.start < node.start || comment.start > argument.start) {
                                    return false;
                                }
                                if (comment.end > argument.start) {
                                    return false;
                                }
                                return true;
                            }
                        );
                        const included = comments.find(({ value }) => value.trim().startsWith('webpackInclude:'));
                        if (!included) {
                            return;
                        }

                        const excluded = comments.find(({ value }) => value.trim().startsWith('webpackExclude:'));
                        const include = new RegExp(
                            included.value
                                .trim()
                                .replace('webpackInclude:', '')
                                .trim()
                                .replace(/^\//, '')
                                .replace(/\/$/, '')
                        );
                        const exclude =
                            excluded &&
                            new RegExp(
                                excluded.value
                                    .trim()
                                    .replace('webpackExclude:', '')
                                    .trim()
                                    .replace(/^\//, '')
                                    .replace(/\/$/, '')
                            );
                        const matched = await glob(`${argument.quasis[0].value.raw}*`, {
                            cwd: path.dirname(args.path),
                        });
                        const map = matched
                            .filter((name) => name.match(include) && (!exclude || !name.match(exclude)))
                            .reduce(
                                (map, name) => {
                                    map[name.replace(include, '')] = `./${name}`;
                                    return map;
                                },
                                /** @type {{ [key: string]: string }} */ ({})
                            );
                        helpers.overwrite(
                            node.start,
                            node.end,
                            `({ ${Object.keys(map)
                                .map((key) => `'${key}': () => import('${map[key]}')`)
                                .join(', ')} })[${argument.expressions[0].name}]()`
                        );
                    },
                });

                walk(ast, {
                    IfStatement(node) {
                        // if (module.hot) {
                        if (
                            node.test.type === 'StaticMemberExpression' &&
                            node.test.object.type === 'Identifier' &&
                            node.test.object.name === 'module' &&
                            node.test.property.type === 'Identifier' &&
                            node.test.property.name === 'hot'
                        ) {
                            helpers.overwrite(node.start, node.end, '');
                            return;
                        }

                        // if (import.meta.webpackHot) {
                        if (
                            node.test.type === 'StaticMemberExpression' &&
                            node.test.object.type === 'MetaProperty' &&
                            node.test.object.meta.type === 'Identifier' &&
                            node.test.object.meta.name === 'import' &&
                            node.test.object.property.type === 'Identifier' &&
                            node.test.object.property.name === 'meta' &&
                            node.test.property.type === 'Identifier' &&
                            node.test.property.name === 'webpackHot'
                        ) {
                            helpers.overwrite(node.start, node.end, '');
                            return;
                        }

                        // if (module && module.hot) {
                        if (
                            node.test.type === 'LogicalExpression' &&
                            node.test.operator === '&&' &&
                            node.test.left.type === 'Identifier' &&
                            node.test.left.name === 'module' &&
                            node.test.right.type === 'StaticMemberExpression' &&
                            node.test.right.object.type === 'Identifier' &&
                            node.test.right.object.name === 'module' &&
                            node.test.right.property.type === 'Identifier' &&
                            node.test.right.property.name === 'hot'
                        ) {
                            helpers.overwrite(node.start, node.end, '');
                            return;
                        }

                        // if (module && module.hot && module.hot.decline) {
                        if (
                            node.test.type === 'LogicalExpression' &&
                            node.test.operator === '&&' &&
                            node.test.left.type === 'LogicalExpression' &&
                            node.test.left.operator === '&&' &&
                            node.test.left.left.type === 'Identifier' &&
                            node.test.left.left.name === 'module' &&
                            node.test.left.right.type === 'StaticMemberExpression' &&
                            node.test.left.right.object.type === 'Identifier' &&
                            node.test.left.right.object.name === 'module' &&
                            node.test.left.right.property.type === 'Identifier' &&
                            node.test.left.right.property.name === 'hot' &&
                            node.test.right.type === 'StaticMemberExpression' &&
                            node.test.right.object.type === 'StaticMemberExpression' &&
                            node.test.right.object.object.type === 'Identifier' &&
                            node.test.right.object.object.name === 'module' &&
                            node.test.right.object.property.type === 'Identifier' &&
                            node.test.right.object.property.name === 'hot' &&
                            node.test.right.property.type === 'Identifier' &&
                            node.test.right.property.name === 'decline'
                        ) {
                            helpers.overwrite(node.start, node.end, '');
                            return;
                        }
                    },
                });

                if (!helpers.isDirty()) {
                    return;
                }

                return helpers.generate({
                    sourcemap: !!sourcemap,
                    sourcesContent,
                });
            });
        },
    };

    return plugin;
}
