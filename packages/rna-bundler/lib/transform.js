import { camelize } from './camelize.js';
import { transformLoaders } from './loaders.js';

/**
 * @typedef {Omit<import('esbuild').BuildOptions, 'loader'> & { root: string, input?: string, code: string, loader?: import('esbuild').Loader, jsxModule?: string, jsxExport?: 'default'|'named'|'namespace', transformPlugins?: import('esbuild').Plugin[] }} TransformConfig
 */

/**
 * @typedef {import('esbuild').TransformResult} TransformResult
 */

/**
 * Build and bundle sources.
 * @param {TransformConfig} config
 * @return {Promise<TransformResult>} The esbuild bundle result.
 */
export async function transform(config) {
    const { default: esbuild } = await import('esbuild');

    const {
        root = process.cwd(),
        input,
        code,
        sourcemap = true,
        minify = false,
        loader = 'tsx',
        format = 'esm',
        globalName = format === 'iife' && input ? camelize(input) : undefined,
        jsxFactory,
        jsxFragment,
        jsxModule,
        jsxExport,
        target = format === 'iife' ? 'es5' : 'es2020',
        plugins = [],
        transformPlugins = [],
    } = config;

    const { outputFiles: [file], warnings } = await esbuild.build({
        stdin: {
            contents: code,
            loader: /** @type {import('esbuild').Loader} */ (`${loader}`),
            resolveDir: root,
            sourcefile: input,
        },
        bundle: false,
        write: false,
        globalName,
        target,
        sourcemap,
        minify,
        format,
        jsxFactory,
        jsxFragment,
        loader: transformLoaders,
        plugins: [
            (await import('@chialab/esbuild-plugin-env')).default(),
            (await import('@chialab/esbuild-plugin-jsx-import')).default({ jsxModule, jsxExport }),
            ...plugins,
            (await import('@chialab/esbuild-plugin-transform')).default([
                (await import('@chialab/esbuild-plugin-commonjs')).default({ esbuild }),
                (await import('@chialab/esbuild-plugin-require-resolve')).default(),
                (await import('@chialab/esbuild-plugin-webpack-include')).default(),
                ...transformPlugins,
            ]),
        ],
    });

    return {
        code: file.text,
        map: '',
        warnings,
    };
}
