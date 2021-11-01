import babel from '@babel/core';
import { resolve } from '@chialab/node-resolve';
import { useRna } from '@chialab/esbuild-rna';

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
            const { target, jsxFactory } = build.initialOptions;
            const { onResolve, onTransform } = useRna(build);

            onResolve({ filter: /@babel\/runtime/ }, async (args) => ({
                path: await resolve(args.path, import.meta.url),
            }));

            onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, async (args) => {
                if (args.path.includes('/@babel/runtime/') ||
                    args.path.includes('/core-js/') ||
                    args.path.includes('regenerator-runtime')) {
                    return;
                }

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

                if (target === 'es5') {
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
                }

                if (jsxFactory) {
                    const { default: htmPlugin } = await import('babel-plugin-htm');
                    plugins.push([htmPlugin, {
                        tag: 'html',
                        pragma: jsxFactory,
                    }]);
                }

                const result = /** @type {import('@babel/core').BabelFileResult} */ (await babel.transformAsync(args.code, config));
                const map = /** @type {import('@chialab/estransform').SourceMap} */ (result.map);

                return {
                    code: /** @type {string} */ (result.code),
                    map,
                };
            });
        },
    };

    return plugin;
}
