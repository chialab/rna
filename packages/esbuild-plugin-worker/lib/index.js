import path from 'path';
import { readFile } from 'fs/promises';
import { resolve as defaultResolve } from '@chialab/node-resolve';
import emitPlugin, { emitChunk } from '@chialab/esbuild-plugin-emit';
import { dependencies } from '@chialab/esbuild-helpers';
import { TARGETS, pipe, walk, getOffsetFromLocation } from '@chialab/estransform';
import { getEntry, finalizeEntry, createFilter, createTypeScriptTransform, getParentBuild } from '@chialab/esbuild-plugin-transform';
import metaUrlPlugin from '@chialab/esbuild-plugin-meta-url';

/**
 * @typedef {{ resolve?: typeof defaultResolve, constructors?: string[] }} PluginOptions
 */

/**
 * Instantiate a plugin that collect and builds Web Workers.
 * @param {PluginOptions} options
 * @return An esbuild plugin.
 */
export default function({ resolve = defaultResolve, constructors = ['Worker', 'SharedWorker'] } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'worker',
        async setup(build) {
            await dependencies(getParentBuild(build) || build, plugin, [
                emitPlugin(),
            ]);

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
                if (constructors.every((ctr) => !entry.code.includes(ctr))) {
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
                            if (callee.type !== 'Identifier' || !constructors.includes(Ctr)) {
                                return;
                            }
                            if (!node.arguments.length) {
                                return;
                            }

                            const value = node.arguments[0].value;
                            if (typeof value !== 'string') {
                                return;
                            }

                            /**
                             * @type {import('@chialab/esbuild-plugin-emit').EmitTransformOptions}
                             */
                            const transformOptions = {
                                format: 'iife',
                                bundle: true,
                            };
                            const options = node.arguments[1];
                            if (options.type === 'ObjectExpression' &&
                                options.properties &&
                                options.properties.some(
                                    /**
                                     * @param {*} prop
                                     */
                                    (prop) =>
                                        prop.type === 'Property' &&
                                        prop.key?.name === 'type' &&
                                        prop.value?.value === 'module'
                                )
                            ) {
                                transformOptions.format = 'esm';
                                transformOptions.bundle = false;
                            }

                            promises.push(Promise.resolve().then(async () => {
                                const resolvedPath = await resolve(value, args.path);
                                const entryPoint = emitChunk(resolvedPath, transformOptions);
                                const startOffset = getOffsetFromLocation(code, node.loc.start);
                                const endOffset = getOffsetFromLocation(code, node.loc.end);
                                magicCode.overwrite(startOffset, endOffset, `new ${Ctr}(new URL('${entryPoint}', import.meta.url).href)`);
                            }));
                        },
                    });

                    await Promise.all(promises);
                });

                return finalizeEntry(build, args.path);
            });

            await dependencies(build, plugin, [
                metaUrlPlugin({ resolve }),
            ], 'after');
        },
    };

    return plugin;
}
