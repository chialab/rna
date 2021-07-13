import swc from '@swc/core';
import esbuildModule from 'esbuild';
import { createResolver } from '@chialab/node-resolve';
import { TARGETS, getTransformOptions, transpileEntry } from '@chialab/esbuild-plugin-transform';

/**
 * @param {{ plugins?: import('@swc/core').Plugin[], pipe?: boolean, cache?: Map<string, *>, esbuild?: typeof esbuildModule }} plugins
 * @return An esbuild plugin.
 */
export default function({ plugins = [], esbuild = esbuildModule } = {}) {
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

                const entry = await await getEntry(args.path);
                const { code, map, loader } = await transpileEntry(entry, esbuild, options);

                /** @type {import('@swc/core').Options} */
                const config = {
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

                return buildEntry(args.path, {
                    code: result.code,
                    map: /** @type {import('@chialab/esbuild-plugin-transform').SourceMap[]} */ ([
                        map,
                        JSON.parse(/** @type {string} */(result.map)),
                    ].filter(Boolean)),
                    loader: loader || 'jsx',
                });
            });
        },
    };

    return plugin;
}
