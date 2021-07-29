import { transformLoaders } from './loaders.js';

/**
 * @typedef {import('esbuild').TransformResult} TransformResult
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

    if (!code) {
        throw new Error('Missing required `code` option');
    }

    const sourceFile = Array.isArray(input) ? input[0] : input;
    const { outputFiles, warnings } = await esbuild.build({
        stdin: {
            contents: code,
            loader,
            resolveDir: root,
            sourcefile: sourceFile,
        },
        bundle: false,
        write: false,
        globalName,
        target,
        sourcemap,
        minify,
        format,
        define,
        jsxFactory,
        jsxFragment,
        loader: transformLoaders,
        sourcesContent: true,
        absWorkingDir: root,
        plugins: [
            (await import('@chialab/esbuild-plugin-env')).default(),
            (await import('@chialab/esbuild-plugin-jsx-import')).default({ jsxModule, jsxExport }),
            ...plugins,
            (await import('@chialab/esbuild-plugin-transform')).default([
                ...transformPlugins,
            ]),
        ],
        logLevel,
    });

    if (!outputFiles) {
        throw new Error(`Failed to transform "${input}"`);
    }

    return {
        code: outputFiles[0].text,
        map: outputFiles[1] ? outputFiles[1].text : '',
        warnings,
    };
}
