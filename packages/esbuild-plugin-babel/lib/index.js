import path from 'path';
import babel from '@babel/core';
import nodeResolve from 'resolve';
import esbuildModule from 'esbuild';
import { TARGETS, getTransformOptions } from '@chialab/esbuild-plugin-transform';

/**
 * @param {string} spec
 * @param {string} importer
 */
function resolve(spec, importer) {
    return new Promise((resolve, reject) => nodeResolve(spec, {
        basedir: path.dirname(importer.replace('file://', '')),
        preserveSymlinks: true,
    }, (err, data) => (err ? reject(err) : resolve(data))));
}

/**
 * @param {{ presets?: import('@babel/core').PluginItem[], plugins?: import('@babel/core').PluginItem[], esbuild?: typeof esbuildModule }} plugins
 * @return An esbuild plugin.
 */
export default function({ presets = [], plugins = [], esbuild = esbuildModule } = {}) {
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

                if (entry.target === TARGETS.typescript) {
                    const { code, map } = await esbuild.transform(entry.code, {
                        sourcefile: args.path,
                        sourcemap: true,
                        loader: 'tsx',
                        format: 'esm',
                        target: TARGETS.es2020,
                        jsxFactory: options.jsxFactory,
                        jsxFragment: options.jsxFragment,
                    });
                    entry.code = code;
                    entry.target = TARGETS.es2020;
                    entry.mappings.push(JSON.parse(map));
                    entry.loader = entry.loader || 'js';
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

                const { default: runtimePlugin } = await import('@babel/plugin-transform-runtime');
                plugins.unshift(
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

                const result = /** @type {import('@babel/core').BabelFileResult} */ (await babel.transformAsync(entry.code, config));
                entry.code = /** @type {string} */ (result.code);
                entry.mappings.push(/** @type {SourceMap} */(result.map));
                entry.loader = entry.loader || 'jsx';

                return buildEntry(args.path);
            });
        },
    };

    return plugin;
}
