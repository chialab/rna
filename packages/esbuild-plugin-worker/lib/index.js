import path from 'path';
import { readFile } from 'fs/promises';
import { resolve as defaultResolve } from '@chialab/node-resolve';
import emitPlugin, { emitChunk } from '@chialab/esbuild-plugin-emit';
import { setupPluginDependencies } from '@chialab/esbuild-helpers';
import { pipe, walk, getOffsetFromLocation, generate } from '@chialab/estransform';
import { getEntry, finalizeEntry, createFilter, getParentBuild, transformError } from '@chialab/esbuild-plugin-transform';
import metaUrlPlugin, { getMetaUrl } from '@chialab/esbuild-plugin-meta-url';

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
            await setupPluginDependencies(getParentBuild(build) || build, plugin, [
                emitPlugin(),
            ]);

            const { sourcesContent } = build.initialOptions;

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
                                    platform: 'neutral',
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
                                    transformOptions.splitting = false;
                                    transformOptions.inject = [];
                                    transformOptions.plugins = [];
                                }

                                const startOffset = getOffsetFromLocation(data.code, node.loc.start);
                                const endOffset = getOffsetFromLocation(data.code, node.loc.end);
                                const value = getMetaUrl(node.arguments[0], data.ast) || node.arguments[0].value;
                                if (typeof value !== 'string') {
                                    if (proxy) {
                                        const arg = generate(node.arguments[0]);
                                        data.magicCode.overwrite(startOffset, endOffset, `new ${Ctr}(${createBlobProxy(arg, transformOptions)})`);
                                    }
                                    return;
                                }

                                promises.push(Promise.resolve().then(async () => {
                                    const resolvedPath = await resolve(value, args.path);
                                    const entryPoint = emitChunk(resolvedPath, transformOptions);
                                    const arg = `new URL('${entryPoint}', import.meta.url).href`;
                                    if (proxy) {
                                        data.magicCode.overwrite(startOffset, endOffset, `new ${Ctr}(${createBlobProxy(arg, transformOptions)})`);
                                    } else {
                                        data.magicCode.overwrite(startOffset, endOffset, `new ${Ctr}(${arg})`);
                                    }
                                }));
                            },
                        });

                        await Promise.all(promises);
                    });
                } catch (error) {
                    process.exit();
                    throw transformError(this.name, error);
                }

                return finalizeEntry(build, args.path);
            });

            await setupPluginDependencies(build, plugin, [
                metaUrlPlugin({ resolve }),
            ], 'after');
        },
    };

    return plugin;
}
