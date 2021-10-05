import path from 'path';
import babel from '@babel/core';
import { resolve } from '@chialab/node-resolve';
import { pipe, TARGETS } from '@chialab/estransform';
import { getEntry, finalizeEntry, createFilter, transformError } from '@chialab/esbuild-plugin-transform';

/**
 * @typedef {{ presets?: import('@babel/core').PluginItem[], plugins?: import('@babel/core').PluginItem[] }} PluginOptions
 */

/**
 * @param {PluginOptions} [options]
 * @return An esbuild plugin.
 */
export default function({ presets = [], plugins = [] } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'babel',
        setup(build) {
            const options = build.initialOptions;

            build.onResolve({ filter: /@babel\/runtime/ }, async (args) => ({
                path: await resolve(args.path, import.meta.url),
            }));

            build.onLoad({ filter: createFilter(build), namespace: 'file' }, async (args) => {
                if (args.path.includes('/@babel/runtime/') ||
                    args.path.includes('/core-js/') ||
                    args.path.includes('regenerator-runtime')) {
                    return;
                }

                const entry = await getEntry(build, args.path);

                try {
                    await pipe(entry, {
                        source: path.basename(args.path),
                        sourcesContent: options.sourcesContent,
                    }, async ({ code }) => {
                        /** @type {import('@babel/core').TransformOptions} */
                        const config = {
                            ast: false,
                            compact: false,
                            filename: args.path,
                            sourceMaps: true,
                            presets,
                            plugins,
                        };

                        const [
                            { default: jsx },
                            { default: runtimePlugin },
                        ] = await Promise.all([
                            import('@babel/plugin-syntax-jsx'),
                            import('@babel/plugin-transform-runtime'),
                        ]);

                        plugins.unshift(
                            jsx,
                            [runtimePlugin, {
                                corejs: false,
                                helpers: true,
                                regenerator: true,
                                useESModules: true,
                            }]
                        );

                        if (options.target === 'es5') {
                            const { default: envPreset } = await import('@babel/preset-env');
                            presets.unshift([envPreset, {
                                targets: {
                                    ie: '11',
                                    chrome: '30',
                                },
                                corejs: {
                                    version: 3,
                                    proposals: true,
                                },
                                bugfixes: true,
                                shippedProposals: true,
                                useBuiltIns: 'entry',
                                modules: false,
                            }]);
                            entry.target = TARGETS.es5;
                        }

                        if (options.jsxFactory) {
                            const { default: htmPlugin } = await import('babel-plugin-htm');
                            plugins.push([htmPlugin, {
                                tag: 'html',
                                pragma: options.jsxFactory,
                            }]);
                        }

                        const result = /** @type {import('@babel/core').BabelFileResult} */ (await babel.transformAsync(code, config));
                        const map = /** @type {import('@chialab/estransform').SourceMap} */ (result.map);

                        return {
                            code: /** @type {string} */ (result.code),
                            map,
                        };
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
