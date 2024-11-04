import path from 'path';
import process from 'process';
import { hasPlugin } from '@chialab/esbuild-rna';
import esbuild from 'esbuild';
import { resolveSourceFile } from './helpers.js';
import { transformLoaders } from './loaders.js';

/**
 * @typedef {import('@chialab/esbuild-rna').Result & { code: string; map?: string }} TransformResult
 */

/**
 * Build and bundle sources.
 * @param {import('@chialab/rna-config-loader').EntrypointConfig} config
 * @returns {Promise<TransformResult>} The esbuild bundle result.
 */
export async function transform(config) {
    const {
        input,
        code,
        root: rootDir = process.cwd(),
        loader = transformLoaders,
        format,
        platform,
        target,
        sourcemap,
        bundle = false,
        minify,
        globalName,
        define,
        jsx,
        jsxFactory,
        jsxFragment,
        jsxImportSource,
        plugins = [],
        logLevel,
        resolveExtensions,
        conditions,
        publicPath,
        inject,
        banner,
        footer,
        tsconfig,
        tsconfigRaw,
    } = config;

    if (code == null) {
        throw new Error('Missing required `code` option');
    }

    const finalPlugins = /** @type {import('esbuild').Plugin[]} */ (
        await Promise.all(
            [
                !hasPlugin(plugins, 'env') &&
                    import('@chialab/esbuild-plugin-env').then(({ default: plugin }) => plugin()),
                !hasPlugin(plugins, 'commonjs') &&
                    import('@chialab/esbuild-plugin-commonjs').then(({ default: plugin }) => plugin()),
                !hasPlugin(plugins, 'worker') &&
                    import('@chialab/esbuild-plugin-worker').then(({ default: plugin }) =>
                        plugin({
                            emit: false,
                        })
                    ),
                !hasPlugin(plugins, 'meta-url') &&
                    import('@chialab/esbuild-plugin-meta-url').then(({ default: plugin }) =>
                        plugin({
                            emit: false,
                        })
                    ),
                ...plugins,
                !hasPlugin(plugins, 'any-file') &&
                    import('@chialab/esbuild-plugin-any-file').then(({ default: plugin }) => plugin()),
            ].filter(Boolean)
        )
    );

    const sourceFile = path.resolve(rootDir, resolveSourceFile(input));
    const absWorkingDir = path.dirname(sourceFile);
    const result = /** @type {import('@chialab/esbuild-rna').Result} */ (
        await esbuild.build({
            stdin: {
                contents: code,
                resolveDir: rootDir,
                sourcefile: sourceFile,
            },
            absWorkingDir,
            outdir: absWorkingDir,
            allowOverwrite: true,
            write: false,
            bundle,
            globalName,
            target,
            platform,
            sourcemap,
            minify,
            format,
            define,
            jsx,
            jsxImportSource,
            jsxFactory,
            jsxFragment,
            loader,
            metafile: true,
            preserveSymlinks: true,
            sourcesContent: true,
            plugins: finalPlugins,
            logLevel,
            resolveExtensions,
            conditions,
            publicPath,
            inject,
            banner,
            footer,
            tsconfig,
            tsconfigRaw,
        })
    );

    const outputFiles = /** @type {import('esbuild').OutputFile[]} */ (result.outputFiles);

    return {
        ...result,
        code: outputFiles[0].text,
        map: outputFiles[1] ? outputFiles[1].text : '',
    };
}
