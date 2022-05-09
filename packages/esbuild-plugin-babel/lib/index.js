import { dirname } from 'path';
import babel from '@babel/core';
import { useRna } from '@chialab/esbuild-rna';

const resolveDir = dirname(new URL(import.meta.url).pathname);

/**
 * @typedef {{ presets?: import('@babel/core').PluginItem[], plugins?: import('@babel/core').PluginItem[] }} PluginOptions
 */

/**
 * @param {PluginOptions} [options]
 * @returns An esbuild plugin.
 */
export default function({ presets = [], plugins = [] } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'babel',
        setup(build) {
            const { target, jsxFactory } = build.initialOptions;
            const { onTransform, rootDir } = useRna(build);

            build.onResolve({ filter: /@babel\/runtime/ }, (args) => {
                if (args.resolveDir === resolveDir) {
                    return;
                }

                return build.resolve(args.path, {
                    importer: args.importer,
                    resolveDir,
                });
            });

            onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, async (args) => {
                if (args.path.includes('/@babel/runtime/') ||
                    args.path.includes('/core-js/') ||
                    args.path.includes('regenerator-runtime')) {
                    return;
                }

                const buildPresets = [...presets];
                const buildPlugins = [...plugins];

                /** @type {import('@babel/core').TransformOptions} */
                const config = {
                    cwd: rootDir,
                    ast: false,
                    compact: false,
                    filename: args.path,
                    sourceMaps: true,
                    presets: buildPresets,
                    plugins: buildPlugins,
                };

                const [
                    { default: jsx },
                    { default: runtimePlugin },
                ] = await Promise.all([
                    import('@babel/plugin-syntax-jsx'),
                    import('@babel/plugin-transform-runtime'),
                ]);

                buildPlugins.unshift(
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
                    buildPresets.unshift([envPreset, {
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
                    buildPlugins.push([htmPlugin, {
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
