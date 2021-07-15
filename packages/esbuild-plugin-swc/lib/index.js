import path from 'path';
import swc from '@swc/core';
import { createResolver } from '@chialab/node-resolve';
import { TARGETS, parseSourcemap, createTypeScriptTransform, pipe } from '@chialab/estransform';
import { getTransformOptions } from '@chialab/esbuild-plugin-transform';

/**
 * @typedef {{ plugins?: import('@swc/core').Plugin[], pipe?: boolean, cache?: Map<string, *> }} PluginOptions
 */

/**
 * @param {PluginOptions} [options]
 * @return An esbuild plugin.
 */
export default function({ plugins = [] } = {}) {
    const resolve = createResolver();

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'swc',
        setup(build) {
            const options = build.initialOptions;
            const { filter, getEntry, buildEntry } = getTransformOptions(build);

            build.onResolve({ filter: /@swc\/helpers/ }, async () => ({
                path: await resolve('@swc/helpers', import.meta.url),
            }));
            build.onLoad({ filter, namespace: 'file' }, async (args) => {
                if (args.path.includes('@swc/helpers/') ||
                    args.path.includes('regenerator-runtime')) {
                    return;
                }

                const entry = await getEntry(args.path);

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
                }, async (magicCode, code) => {
                    /** @type {import('@swc/core').Options} */
                    const config = {
                        filename: args.path,
                        sourceFileName: args.path,
                        sourceMaps: true,
                        jsc: {
                            parser: {
                                syntax: 'ecmascript',
                                jsx: true,
                                dynamicImport: true,
                                privateMethod: true,
                                functionBind: true,
                                exportDefaultFrom: true,
                                exportNamespaceFrom: true,
                                decoratorsBeforeExport: true,
                                importMeta: true,
                                decorators: true,
                            },
                            externalHelpers: true,
                            target: /** @type {import('@swc/core').JscTarget} */ (options.target || 'es2020'),
                            transform: {
                                optimizer: undefined,
                            },
                        },
                    };

                    if (options.target === 'es5') {
                        config.env = {
                            targets: {
                                ie: '11',
                            },
                            shippedProposals: true,
                        };
                        entry.target = TARGETS.es5;
                    }

                    if (options.jsxFactory) {
                        plugins.push((await import('@chialab/swc-plugin-htm')).plugin({
                            tag: 'html',
                            pragma: options.jsxFactory,
                        }));
                    }

                    config.plugin = swc.plugins(plugins);

                    const result = await swc.transform(code, config);
                    const map = parseSourcemap(/** @type {string} */(result.map));

                    return {
                        code: result.code,
                        map,
                    };
                });

                return buildEntry(args.path);
            });
        },
    };

    return plugin;
}
