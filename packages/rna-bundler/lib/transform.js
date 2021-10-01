import path from 'path';
import { transformLoaders } from './loaders.js';

/**
 * @typedef {import('esbuild').Metafile} Metafile
 */

/**
 * @typedef {import('esbuild').BuildResult & { metafile: Metafile, outputFiles?: import('esbuild').OutputFile[] }} BuildResult
 */

/**
 * @typedef {import('esbuild').TransformResult & { metafile: Metafile, dependencies: import('@chialab/esbuild-plugin-dependencies').DependenciesMap, outputFiles?: import('esbuild').OutputFile[] }} TransformResult
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
        root,
        loader,
        format,
        platform,
        target,
        sourcemap,
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

    const { default: dependenciesPlugin, getResultDependencies } = await import('@chialab/esbuild-plugin-dependencies');
    const finalPlugins = await Promise.all([
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
        dependenciesPlugin(),
    ]);

    const sourceFile = path.resolve(root, Array.isArray(input) ? input[0] : input);
    const result = /** @type {BuildResult} */ (await esbuild.build({
        stdin: {
            contents: code,
            loader,
            resolveDir: root,
            sourcefile: sourceFile,
        },
        write: false,
        bundle: false,
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
        absWorkingDir: path.dirname(sourceFile),
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
        dependencies: getResultDependencies(result) || {},
    };
}
