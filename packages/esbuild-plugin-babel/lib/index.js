import { promises } from 'fs';
import path from 'path';
import babel from '@babel/core';
import nodeResolve from 'resolve';

const { readFile } = promises;
const SCRIPT_LOADERS = ['tsx', 'ts', 'jsx', 'js'];

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
 * @param {import('esbuild').OnLoadArgs & { contents?: string }} args
 * @param {string} target
 * @param {import('@babel/core').PluginItem[]} presets
 * @param {import('@babel/core').PluginItem[]} plugins
 * @param {import('esbuild').BuildOptions} options
 * @param {{ code?: string }} cache
 * @param {boolean} pipe
 * @return {Promise<import('esbuild').OnLoadResult|undefined>}
 */
async function run({ path: filePath }, target, presets, plugins, options, cache, pipe) {
    let contents = cache.code || await readFile(filePath, 'utf-8');

    /** @type {import('@babel/core').TransformOptions} */
    let config = {
        ast: false,
        compact: false,
        filename: filePath,
        sourceMaps: 'inline',
        presets,
        plugins,
    };

    let { default: runtimePlugin } = await import('@babel/plugin-transform-runtime');
    let { default: tsPlugin } = await import('@babel/plugin-transform-typescript');
    plugins.unshift(
        [runtimePlugin, {
            corejs: false,
            helpers: true,
            regenerator: true,
        }],
        [tsPlugin, {
            isTSX: true,
            onlyRemoveTypeImports: true,
        }]
    );

    if (target === 'es5') {
        let { default: envPreset } = await import('@babel/preset-env');
        presets.unshift([envPreset, {
            targets: {
                ie: '11',
            },
            corejs: {
                version: 3,
                proposals: true,
            },
            bugfixes: true,
            shippedProposals: true,
            useBuiltIns: 'entry',
            modules: false,
            exclude: [
                '@babel/plugin-transform-typeof-symbol',
            ],
        }]);
    }

    if (options.jsxFactory) {
        let { default: htmPlugin } = await import('babel-plugin-htm');
        plugins.push([htmPlugin, {
            tag: 'html',
            pragma: options.jsxFactory,
        }]);
    }

    let result = /** @type {import('@babel/core').BabelFileResult} */ (await babel.transformAsync(contents, config));
    contents = /** @type {string} */ (result.code);

    if (pipe) {
        cache.code = contents;
        return;
    }
    return {
        contents,
        loader: 'tsx',
    };
}

/**
 * @param {{ target?: string, presets?: import('@babel/core').PluginItem[], plugins?: import('@babel/core').PluginItem[], pipe?: boolean, cache?: Map<string, *> }} plugins
 * @return An esbuild plugin.
 */
export default function({ target = 'esnext', presets = [], plugins = [], pipe = false, cache = new Map() } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'swc',
        setup(build) {
            let options = build.initialOptions;
            options.metafile = true;
            let { loader = {} } = options;
            let keys = Object.keys(loader);
            let tsxExtensions = keys.filter((key) => SCRIPT_LOADERS.includes(loader[key]));
            let tsxRegex = new RegExp(`\\.(${tsxExtensions.map((ext) => ext.replace('.', '')).join('|')})$`);

            build.onResolve({ filter: /@swc\/helpers/ }, async () => ({
                path: await resolve('@swc/helpers', import.meta.url),
            }));
            build.onLoad({ filter: tsxRegex, namespace: 'file' }, (args) => {
                if (args.path.includes('@swc/helpers/') ||
                    args.path.includes('regenerator-runtime')) {
                    return;
                }
                cache.set(args.path, cache.get(args.path) || {});
                return run(args, target, presets, plugins, options, cache.get(args.path), pipe);
            });
        },
    };

    return plugin;
}
