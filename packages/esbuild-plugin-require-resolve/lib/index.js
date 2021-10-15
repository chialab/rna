import path from 'path';
import { readFile } from 'fs/promises';
import { resolve } from '@chialab/node-resolve';
import { pipe, walk, getOffsetFromLocation } from '@chialab/estransform';
import { getEntry, finalizeEntry, createFilter } from '@chialab/esbuild-plugin-transform';

/**
 * Instantiate a plugin that converts URL references into static import
 * in order to handle assets bundling.
 * @return An esbuild plugin.
 */
export default function() {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'require-resolve',
        setup(build) {
            const { sourcesContent } = build.initialOptions;

            build.onResolve({ filter: /\.requirefile$/ }, async ({ path: filePath }) => ({
                path: filePath.replace(/\.requirefile$/, ''),
                namespace: 'require-resolve',
            }));
            build.onLoad({ filter: /\./, namespace: 'require-resolve' }, async ({ path: filePath }) => ({
                contents: await readFile(filePath),
                loader: 'file',
            }));
            build.onLoad({ filter: createFilter(build), namespace: 'file' }, async (args) => {
                /**
                 * @type {import('@chialab/estransform').Pipeline}
                 */
                const entry = args.pluginData || await getEntry(build, args.path);
                if (!entry.code.includes('require.resolve(')) {
                    return;
                }

                await pipe(entry, {
                    source: path.basename(args.path),
                    sourcesContent,
                }, async ({ magicCode, ast, code }) => {
                    /**
                     * @type {Promise<void>[]}
                     */
                    const promises = [];

                    walk(ast, {
                        /**
                         * @param {*} node
                         */
                        CallExpression(node) {
                            if (!node.callee ||
                                node.callee.type !== 'MemberExpression' ||
                                node.callee.object.type !== 'Identifier' ||
                                node.callee.object.name !== 'require' ||
                                node.callee.property.type !== 'Identifier' ||
                                node.callee.property.name !== 'resolve') {
                                return;
                            }

                            if (node.arguments.length !== 1 ||
                                node.arguments[0].type !== 'Literal') {
                                return;
                            }

                            promises.push((async () => {
                                const value = node.arguments[0].value;
                                const entryPoint = await resolve(value, args.path);
                                const identifier = `_${value.replace(/[^a-zA-Z0-9]/g, '_')}`;

                                if (entry.code.startsWith('#!')) {
                                    magicCode.appendRight(entry.code.indexOf('\n') + 1, `var ${identifier} = require('${entryPoint}.requirefile');\n`);
                                } else {
                                    magicCode.prepend(`var ${identifier} = require('${entryPoint}.requirefile');\n`);
                                }
                                magicCode.overwrite(
                                    getOffsetFromLocation(code, node.loc.start),
                                    getOffsetFromLocation(code, node.loc.end),
                                    identifier
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
