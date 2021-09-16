import path from 'path';
import { readFile } from 'fs/promises';
import { resolve as defaultResolve } from '@chialab/node-resolve';
import emitPlugin, { emitChunk } from '@chialab/esbuild-plugin-emit';
import { dependencies } from '@chialab/esbuild-helpers';
import { TARGETS, pipe, walk, getOffsetFromLocation } from '@chialab/estransform';
import { getEntry, finalizeEntry, createFilter, createTypeScriptTransform, getParentBuild } from '@chialab/esbuild-plugin-transform';
import metaUrlPlugin from '@chialab/esbuild-plugin-meta-url';
import escodegen from 'escodegen';

/**
 * @typedef {{ resolve?: typeof defaultResolve, constructors?: string[], proxy?: boolean }} PluginOptions
 */

/**
 * Create a blob proxy worker code.
 * @param {string} argument The url reference.
 * @param {import('@chialab/esbuild-plugin-emit').EmitTransformOptions} transformOptions The transform options for the url.
 */
function createBlobProxy(argument, transformOptions) {
    const createUrlFn = `(function(path) {
    const url = new URL(path);
    url.searchParams.set('transform', '${JSON.stringify(transformOptions)}');
    return url.href;
})`;
    const blobContent = transformOptions.format === 'esm' ?
        `'import "' + ${createUrlFn}(${argument}) + '";'` :
        `'importScripts("' + ${createUrlFn}(${argument}) + '");'`;

    return `URL.createObjectURL(new Blob([${blobContent}], { type: 'text/javascript' }))`;
}

/**
 * Instantiate a plugin that collect and builds Web Workers.
 * @param {PluginOptions} options
 * @return An esbuild plugin.
 */
export default function({ resolve = defaultResolve, constructors = ['Worker', 'SharedWorker'], proxy = false } = {}) {
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

                            /**
                             * @type {import('@chialab/esbuild-plugin-emit').EmitTransformOptions}
                             */
                            const transformOptions = {
                                format: 'iife',
                                bundle: true,
                            };
                            const options = node.arguments[1];
                            if (options &&
                                options.type === 'ObjectExpression' &&
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
                            } else {
                                transformOptions.inject = [];
                                transformOptions.plugins = [];
                            }

                            const startOffset = getOffsetFromLocation(code, node.loc.start);
                            const endOffset = getOffsetFromLocation(code, node.loc.end);
                            const value = node.arguments[0].value;
                            if (typeof value !== 'string') {
                                if (proxy) {
                                    const arg = escodegen.generate(node.arguments[0]);
                                    magicCode.overwrite(startOffset, endOffset, `new ${Ctr}(${createBlobProxy(arg, transformOptions)})`);
                                }
                                return;
                            }

                            promises.push(Promise.resolve().then(async () => {
                                const resolvedPath = await resolve(value, args.path);
                                const entryPoint = emitChunk(resolvedPath, transformOptions);
                                const arg = `new URL('${entryPoint}', import.meta.url).href`;
                                if (proxy) {
                                    magicCode.overwrite(startOffset, endOffset, `new ${Ctr}(${createBlobProxy(arg, transformOptions)})`);
                                } else {
                                    magicCode.overwrite(startOffset, endOffset, `new ${Ctr}(${arg})`);
                                }
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
