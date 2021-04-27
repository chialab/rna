import { promises } from 'fs';
import path from 'path';
import swc from '@swc/core';
import nodeResolve from 'resolve';
import esbuildModule from 'esbuild';

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
 * @param {import('@swc/core').Plugin[]} plugins
 * @param {import('esbuild').BuildOptions} options
 * @param {typeof esbuildModule} esbuild
 * @param {{ code?: string }} cache
 * @param {boolean} pipe
 * @return {Promise<import('esbuild').OnLoadResult|undefined>}
 */
async function run({ path: filePath }, target, plugins, options, esbuild, cache, pipe) {
    let contents = cache.code || await readFile(filePath, 'utf-8');

    let { code: esbuildCode } = await esbuild.transform(contents, {
        sourcefile: filePath,
        sourcemap: 'inline',
        loader: 'tsx',
        format: 'esm',
        target: 'es2020',
        jsxFactory: options.jsxFactory,
        jsxFragment: options.jsxFragment,
    });
    contents = esbuildCode;

    let jscTarget = /** @type {import('@swc/core').JscTarget} */ (target);

    /** @type {import('@swc/core').Options} */
    let config = {
        sourceFileName: filePath,
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
            target: jscTarget,
            transform: {
                optimizer: undefined,
            },
        },
        plugin: swc.plugins(plugins),
    };

    if (target === 'es5') {
        config.env = {
            targets: {
                ie: '11',
            },
            shippedProposals: true,
        };
    }

    let { code, map } = await swc.transform(contents, config);
    contents = code;
    if (map) {
        contents += `\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(map).toString('base64')}`;
    }

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
 * @param {{ target?: string, plugins?: import('@swc/core').Plugin[], pipe?: boolean, cache?: Map<string, *>, esbuild?: typeof esbuildModule }} plugins
 * @return An esbuild plugin.
 */
export default function({ target = 'esnext', plugins = [], pipe = false, cache = new Map() } = {}, esbuild = esbuildModule) {
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

            /**
             * @see https://github.com/chialab/rna/issues/14
             */
            if (target === 'es5') {
                options.target = 'es6';
            }

            build.onResolve({ filter: /@swc\/helpers/ }, async () => ({
                path: await resolve('@swc/helpers', import.meta.url),
            }));
            build.onLoad({ filter: tsxRegex, namespace: 'file' }, (args) => {
                if (args.path.includes('@swc/helpers/') ||
                    args.path.includes('regenerator-runtime')) {
                    return;
                }
                cache.set(args.path, cache.get(args.path) || {});
                return run(args, target, plugins, options, esbuild, cache.get(args.path), pipe);
            });
        },
    };

    return plugin;
}
