import babel from '@babel/core';
import { createResolver } from '@chialab/node-resolve';
import esbuildModule from 'esbuild';
import { TARGETS, getTransformOptions, transpileEntry } from '@chialab/esbuild-plugin-transform';

/**
 * @param {{ presets?: import('@babel/core').PluginItem[], plugins?: import('@babel/core').PluginItem[], esbuild?: typeof esbuildModule }} plugins
 * @return An esbuild plugin.
 */
export default function({ presets = [], plugins = [], esbuild = esbuildModule } = {}) {
    const resolve = createResolver();

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'babel',
        setup(build) {
            const options = build.initialOptions;
            const { filter, getEntry, buildEntry } = getTransformOptions(build);

            build.onResolve({ filter: /@babel\/runtime/ }, async (args) => ({
                path: await resolve(args.path, import.meta.url),
            }));
            build.onLoad({ filter, namespace: 'file' }, async (args) => {
                if (args.path.includes('/@babel/runtime/') ||
                    args.path.includes('/core-js/') ||
                    args.path.includes('regenerator-runtime')) {
                    return;
                }

                const entry = await await getEntry(args.path);
                const { code, map, loader } = await transpileEntry(entry, esbuild, options);

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
                return buildEntry(args.path, {
                    code: /** @type {string} */ (result.code),
                    map: /** @type {import('@chialab/esbuild-plugin-transform').SourceMap[]} */ ([
                        map,
                        result.map,
                    ].filter(Boolean)),
                    loader: loader || 'jsx',
                });
            });
        },
    };

    return plugin;
}
