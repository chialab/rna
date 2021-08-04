import { readFile } from 'fs/promises';
import path from 'path';
import { resolve as defaultResolve } from '@chialab/node-resolve';
import { emitChunk } from '@chialab/esbuild-plugin-emit';
import { TARGETS, pipe, walk, createTypeScriptTransform, getOffsetFromLocation } from '@chialab/estransform';
import { getEntry, finalizeEntry, createFilter } from '@chialab/esbuild-plugin-transform';

/**
 * @typedef {{ resolve?: typeof defaultResolve }} PluginOptions
 */

/**
 * Instantiate a plugin that collect and builds Web Workers.
 * @param {PluginOptions} options
 * @return An esbuild plugin.
 */
export default function({ resolve = defaultResolve } = {}) {
    const Identifiers = ['Worker', 'SharedWorker'];

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'worker',
        setup(build) {
            const options = build.initialOptions;

            build.onResolve({ filter: /(\?|&)loader=worker$/ }, async ({ path: filePath }) => ({
                path: filePath.split('?')[0],
                namespace: 'worker',
            }));

            build.onLoad({ filter: /\./, namespace: 'worker' }, async ({ path: filePath }) => ({
                contents: await readFile(filePath),
                loader: 'file',
            }));

            build.onLoad({ filter: createFilter(build), namespace: 'file' }, async (args) => {
                /**
                 * @type {import('@chialab/estransform').Pipeline}
                 */
                const entry = args.pluginData || await getEntry(build, args.path);
                if (Identifiers.every((Id) => !entry.code.includes(Id))) {
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
                     * @type {Promise<void>[]}
                     */
                    const promises = [];

                    walk(ast, {
                        /**
                         * @param {*} node
                         */
                        NewExpression(node) {
                            let callee = node.callee;
                            if (callee.type === 'MemberExpression') {
                                if (callee.object.name !== 'window' &&
                                    callee.object.name !== 'self' &&
                                    callee.object.name !== 'globalThis') {
                                    return;
                                }
                                callee = callee.property;
                            }
                            const Ctr = callee.name;
                            if (callee.type !== 'Identifier' || !Identifiers.includes(Ctr)) {
                                return;
                            }
                            if (!node.arguments.length) {
                                return;
                            }
                            if (typeof node.arguments[0].value !== 'string') {
                                return;
                            }

                            promises.push(Promise.resolve().then(async () => {
                                const value = node.arguments[0].value;
                                const resolvedPath = await resolve(value, args.path);
                                const entryPoint = emitChunk(resolvedPath, {
                                    format: 'iife',
                                });
                                const startOffset = getOffsetFromLocation(code, node.loc.start.line, node.loc.start.column);
                                const endOffset = getOffsetFromLocation(code, node.loc.end.line, node.loc.end.column);
                                magicCode.overwrite(startOffset, endOffset, `new ${Ctr}(new URL('${entryPoint}', import.meta.url).href)`);
                            }));
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
