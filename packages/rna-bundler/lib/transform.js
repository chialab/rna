import path from 'path';
import { mergeDependencies } from '@chialab/esbuild-helpers';
import { transformLoaders } from './loaders.js';

/**
 * @typedef {import('esbuild').Metafile} Metafile
 */

/**
 * @typedef {import('esbuild').BuildResult & { metafile: Metafile, outputFiles?: import('esbuild').OutputFile[] }} BuildResult
 */

/**
 * @typedef {import('esbuild').TransformResult & { metafile: Metafile, dependencies: import('@chialab/esbuild-helpers').DependenciesMap, outputFiles?: import('esbuild').OutputFile[] }} TransformResult
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
        plugins,
        transformPlugins,
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
    const finalPlugins = await Promise.all([
        /**
         * @type {import('esbuild').Plugin}
         */
        ({
            setup(build) {
                pluginBuild = build;
            },
        }),
        import('@chialab/esbuild-plugin-env')
            .then(({ default: plugin }) => plugin()),
        import('@chialab/esbuild-plugin-define-this')
            .then(({ default: plugin }) => plugin()),
        import('@chialab/esbuild-plugin-jsx-import')
            .then(({ default: plugin }) => plugin({ jsxModule, jsxExport })),
        import('@chialab/esbuild-plugin-bundle-dependencies')
            .then(({ default: plugin }) => plugin({
                dependencies: false,
                peerDependencies: false,
                optionalDependencies: false,
            })),
        ...plugins,
        import('@chialab/esbuild-plugin-transform')
            .then(async ({ default: plugin }) =>
                plugin([
                    ...transformPlugins,
                ])
            ),
    ]);

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

    return {
        code: result.outputFiles[0].text,
        map: result.outputFiles[1] ? result.outputFiles[1].text : '',
        warnings: result.warnings,
        metafile: result.metafile,
        dependencies: mergeDependencies(
            /** @type {import('esbuild').PluginBuild} */(pluginBuild),
            result,
            rootDir
        ),
    };
}
