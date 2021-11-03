import path from 'path';
import { rnaPlugin, useRna, hasPlugin } from '@chialab/esbuild-rna';
import { transformLoaders } from './loaders.js';

/**
 * @typedef {import('esbuild').Metafile} Metafile
 */

/**
 * @typedef {import('esbuild').BuildResult & { metafile: Metafile, outputFiles?: import('esbuild').OutputFile[] }} BuildResult
 */

/**
 * @typedef {import('esbuild').TransformResult & { metafile: Metafile, dependencies: import('@chialab/esbuild-rna').DependenciesMap, outputFiles?: import('esbuild').OutputFile[] }} TransformResult
 */

/**
 * Build and bundle sources.
 * @param {import('@chialab/rna-config-loader').EntrypointFinalConfig} config
 * @return {Promise<TransformResult>} The esbuild bundle result.
 */
export async function transform(config) {
    const { default: esbuild } = await import('esbuild');

    const {
        input,
        code,
        root: rootDir,
        loader,
        format,
        platform,
        target,
        sourcemap,
        bundle = false,
        minify,
        globalName,
        define,
        jsxFactory,
        jsxFragment,
        jsxModule,
        jsxExport,
        plugins = [],
        logLevel,
    } = config;

    if (code == null) {
        throw new Error('Missing required `code` option');
    }

    /**
     * @type {import('esbuild').PluginBuild|undefined}
     */
    let pluginBuild;

    /**
     * @type {import('esbuild').Plugin[]}
     */
    const finalPlugins = (await Promise.all([
        rnaPlugin(),
        /**
         * @type {import('esbuild').Plugin}
         */
        ({
            name: '__rna-internal__',
            setup(build) {
                pluginBuild = build;
            },
        }),
        !hasPlugin(plugins, 'env') &&
            import('@chialab/esbuild-plugin-env')
                .then(({ default: plugin }) => plugin()),
        !hasPlugin(plugins, 'define-this') &&
            import('@chialab/esbuild-plugin-define-this')
                .then(({ default: plugin }) => plugin()),
        !hasPlugin(plugins, 'jsx-import') &&
            import('@chialab/esbuild-plugin-jsx-import')
                .then(({ default: plugin }) => plugin({ jsxModule, jsxExport })),
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
                .then(({ default: plugin }) => plugin({
                    helperModule: true,
                })),
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
    const result = /** @type {BuildResult} */ (await esbuild.build({
        stdin: {
            contents: code,
            loader,
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
        jsxFactory,
        jsxFragment,
        loader: transformLoaders,
        metafile: true,
        preserveSymlinks: true,
        sourcesContent: true,
        absWorkingDir,
        plugins: finalPlugins,
        logLevel,
    }));

    if (!result.outputFiles) {
        throw new Error(`Failed to transform "${input}"`);
    }

    const dependencies = useRna(/** @type {import('esbuild').PluginBuild} */(pluginBuild))
        .mergeDependencies(result);

    return {
        code: result.outputFiles[0].text,
        map: result.outputFiles[1] ? result.outputFiles[1].text : '',
        warnings: result.warnings,
        metafile: result.metafile,
        dependencies,
    };
}
