import path from 'path';
import { resolve as defaultResolve, isUrl } from '@chialab/node-resolve';
import { emitFile, getBaseUrl, prependImportStatement } from '@chialab/esbuild-plugin-emit';
import { TARGETS, pipe, walk, getOffsetFromLocation } from '@chialab/estransform';
import { getEntry, finalizeEntry, createFilter, createTypeScriptTransform } from '@chialab/esbuild-plugin-transform';

/**
 * @typedef {{ resolve?: typeof defaultResolve }} PluginOptions
 */

/**
 * Instantiate a plugin that converts URL references into static import
 * in order to handle assets bundling.
 * @param {PluginOptions} [options]
 * @return An esbuild plugin.
 */
export default function({ resolve = defaultResolve } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'meta-url',
        setup(build) {
            const options = build.initialOptions;

            build.onLoad({ filter: createFilter(build), namespace: 'file' }, async (args) => {
                /**
                 * @type {import('@chialab/estransform').Pipeline}
                 */
                const entry = args.pluginData || await getEntry(build, args.path);
                if (!entry.code.includes('import.meta.url') ||
                    !entry.code.includes('URL(')) {
                    return;
                }

                if (entry.target === TARGETS.typescript) {
                    await pipe(entry, {
                        source: path.basename(args.path),
                        sourcesContent: options.sourcesContent,
                    }, createTypeScriptTransform({
                        loader: entry.loader,
                        jsxFactory: options.jsxFactory,
                        jsxFragment: options.jsxFragment,
                    }));
                }

                await pipe(entry, {
                    source: path.basename(args.path),
                    sourcesContent: options.sourcesContent,
                }, async ({ magicCode, code, ast }) => {
                    /**
                     * @type {{ [key: string]: string }}
                     */
                    const ids = {};

                    /**
                     * @type {Promise<void>[]}
                     */
                    const promises = [];

                    walk(ast, {
                        /**
                         * @param {*} node
                         */
                        NewExpression(node) {
                            if (!node.callee || node.callee.type !== 'Identifier' || node.callee.name !== 'URL') {
                                return;
                            }

                            if (node.arguments.length !== 2 ||
                                node.arguments[0].type !== 'Literal' ||
                                node.arguments[1].type !== 'MemberExpression') {
                                return;
                            }

                            if (node.arguments[1].object.type !== 'MetaProperty' ||
                                node.arguments[1].property.type !== 'Identifier' ||
                                node.arguments[1].property.name !== 'url') {
                                return;
                            }

                            const value = node.arguments[0].value;
                            if (typeof value !== 'string' || isUrl(value)) {
                                return;
                            }

                            promises.push((async () => {
                                const resolvedPath = await resolve(value, args.path);
                                const startOffset = getOffsetFromLocation(code, node.loc.start);
                                const endOffset = getOffsetFromLocation(code, node.loc.end);
                                if (!ids[resolvedPath]) {
                                    const entryPoint = emitFile(resolvedPath);
                                    const { identifier } = prependImportStatement({ ast, magicCode, code }, entryPoint, value);
                                    ids[resolvedPath] = identifier;
                                }

                                magicCode.overwrite(startOffset, endOffset, `new URL(${ids[resolvedPath]}, ${getBaseUrl(build)})`);
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
