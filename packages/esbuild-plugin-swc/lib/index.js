import path from 'path';
import swc from '@swc/core';
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
 * @param {{ plugins?: import('@swc/core').Plugin[], pipe?: boolean, cache?: Map<string, *>, esbuild?: typeof esbuildModule }} plugins
 * @return An esbuild plugin.
 */
export default function({ plugins = [], esbuild = esbuildModule } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'swc',
        setup(build) {
            const options = build.initialOptions;
            const loaders = options.loader || {};
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

                if (entry.target === TARGETS.typescript) {
                    const { code, map } = await esbuild.transform(entry.code, {
                        sourcefile: args.path,
                        sourcemap: true,
                        loader: loaders[path.extname(args.path)] === 'ts' ? 'ts' : 'tsx',
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

                const { code, map } = await swc.transform(entry.code, config);
                entry.code = code;
                entry.mappings.push(JSON.parse(/** @type {string} */(map)));
                entry.loader = entry.loader || 'jsx';

                return buildEntry(args.path);
            });
        },
    };

    return plugin;
}
