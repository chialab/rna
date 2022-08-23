import path from 'path';
import esbuild from 'esbuild';
import { hasPlugin } from '@chialab/esbuild-rna';
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
        ...otherOptions
    } = config;

    if (code == null) {
        throw new Error('Missing required `code` option');
    }

    const finalPlugins = /** @type {import('esbuild').Plugin[]} */ (await Promise.all([
        !hasPlugin(plugins, 'env') &&
            import('@chialab/esbuild-plugin-env')
                .then(({ default: plugin }) => plugin()),
        !hasPlugin(plugins, 'define-this') &&
            import('@chialab/esbuild-plugin-define-this')
                .then(({ default: plugin }) => plugin()),
        !hasPlugin(plugins, 'external') &&
            import('@chialab/esbuild-plugin-external')
                .then(({ default: plugin }) => plugin({
                    dependencies: false,
                    peerDependencies: false,
                    optionalDependencies: false,
                })),
        !hasPlugin(plugins, 'css-import') &&
            import('@chialab/esbuild-plugin-css-import')
                .then(({ default: plugin }) => plugin()),
        !hasPlugin(plugins, 'unwebpack') &&
            import('@chialab/esbuild-plugin-unwebpack')
                .then(({ default: plugin }) => plugin()),
        !hasPlugin(plugins, 'commonjs') &&
            import('@chialab/esbuild-plugin-commonjs')
                .then(({ default: plugin }) => plugin()),
        !hasPlugin(plugins, 'worker') &&
            import('@chialab/esbuild-plugin-worker')
                .then(({ default: plugin }) => plugin({
                    emit: false,
                })),
        !hasPlugin(plugins, 'meta-url') &&
            import('@chialab/esbuild-plugin-meta-url')
                .then(({ default: plugin }) => plugin({
                    emit: false,
                })),
        ...plugins,
    ].filter(Boolean)));

    const sourceFile = path.resolve(rootDir, Array.isArray(input) ? input[0] : input);
    const absWorkingDir = path.dirname(sourceFile);
    const result = /** @type {import('@chialab/esbuild-rna').Result} */ (await esbuild.build({
        ...otherOptions,
        stdin: {
            contents: code,
            resolveDir: rootDir,
            sourcefile: sourceFile,
        },
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
        absWorkingDir,
        plugins: finalPlugins,
        logLevel,
    }));

    const outputFiles = /** @type {import('esbuild').OutputFile[]} */ (result.outputFiles);

    return {
        ...result,
        code: outputFiles[0].text,
        map: outputFiles[1] ? outputFiles[1].text : '',
    };
}
