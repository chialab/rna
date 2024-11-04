import { rm } from 'fs/promises';
import path from 'path';
import process from 'process';
import { hasPlugin } from '@chialab/esbuild-rna';
import esbuild from 'esbuild';
import { resolveSourceFile } from './helpers.js';
import { loaders } from './loaders.js';

/**
 * @typedef {import('esbuild').Metafile} Metafile
 */

/**
 * Build and bundle sources.
 * @param {import('@chialab/rna-config-loader').EntrypointConfig} config
 * @returns {Promise<import('@chialab/esbuild-rna').Result>} The esbuild bundle result.
 */
export async function build(config) {
    if (!config.output) {
        throw new Error('Missing `output` option');
    }

    const hasOutputFile = !!path.extname(config.output);
    const {
        input,
        output,
        root: rootDir = process.cwd(),
        code,
        loader = loaders,
        format,
        target,
        platform,
        sourcemap,
        minify,
        bundle,
        splitting = format === 'esm' && !hasOutputFile,
        globalName,
        entryNames,
        chunkNames,
        assetNames,
        define,
        external,
        alias,
        jsx,
        jsxFactory,
        jsxFragment,
        jsxImportSource,
        plugins = [],
        logLevel,
        clean,
        watch,
        write = true,
        preserveSymlinks = true,
        mainFields,
        resolveExtensions,
        conditions,
        publicPath,
        inject,
        banner,
        footer,
        manifestPath,
        entrypointsPath,
        tsconfig,
        tsconfigRaw,
    } = config;

    const entryOptions = {};
    if (code) {
        entryOptions.stdin = {
            contents: code,
            resolveDir: rootDir,
            sourcefile: resolveSourceFile(input),
        };
    } else if (input) {
        entryOptions.entryPoints = typeof input === 'string' ? [input] : input;
    }

    const outputDir = hasOutputFile ? path.dirname(output) : output;
    if (clean) {
        await rm(path.resolve(rootDir, outputDir), { recursive: true, force: true });
    }

    const finalPlugins = /** @type {import('esbuild').Plugin[]} */ (
        await Promise.all(
            [
                !hasPlugin(plugins, 'env') &&
                    import('@chialab/esbuild-plugin-env').then(({ default: plugin }) => plugin()),
                !hasPlugin(plugins, 'commonjs') &&
                    import('@chialab/esbuild-plugin-commonjs').then(({ default: plugin }) =>
                        plugin({
                            helperModule: true,
                        })
                    ),
                !hasPlugin(plugins, 'worker') &&
                    import('@chialab/esbuild-plugin-worker').then(({ default: plugin }) => plugin()),
                !hasPlugin(plugins, 'meta-url') &&
                    import('@chialab/esbuild-plugin-meta-url').then(({ default: plugin }) => plugin()),
                !hasPlugin(plugins, 'html') &&
                    import('@chialab/esbuild-plugin-html').then(({ default: plugin }) =>
                        plugin({
                            modulesTarget: target || 'es2020',
                        })
                    ),
                ...plugins,
                !hasPlugin(plugins, 'any-file') &&
                    import('@chialab/esbuild-plugin-any-file').then(({ default: plugin }) => plugin()),
                !hasPlugin(plugins, 'metadata') &&
                    import('@chialab/esbuild-plugin-metadata').then(({ default: plugin }) =>
                        plugin({
                            manifestPath,
                            entrypointsPath,
                        })
                    ),
            ].filter(Boolean)
        )
    );

    const context = await esbuild.context({
        ...entryOptions,
        outfile: hasOutputFile ? output : undefined,
        outdir: hasOutputFile ? undefined : output,
        format,
        target,
        platform,
        sourcemap,
        minify,
        globalName,
        entryNames,
        chunkNames,
        assetNames,
        splitting,
        metafile: true,
        bundle: true,
        packages: bundle ? undefined : 'external',
        treeShaking: minify ? true : undefined,
        define,
        alias,
        external,
        mainFields,
        jsx,
        jsxImportSource,
        jsxFactory,
        jsxFragment,
        loader,
        preserveSymlinks,
        sourcesContent: true,
        plugins: finalPlugins,
        logLevel,
        absWorkingDir: rootDir,
        write,
        allowOverwrite: !write,
        resolveExtensions,
        conditions,
        publicPath,
        inject,
        banner,
        footer,
        tsconfig,
        tsconfigRaw,
    });

    const result = /** @type {import('@chialab/esbuild-rna').Result} */ (await context.rebuild());
    if (watch) {
        await context.watch();
    } else {
        await context.dispose();
    }

    return {
        ...result,
        dependencies: result.dependencies,
    };
}
