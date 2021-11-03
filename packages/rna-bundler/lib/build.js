import path from 'path';
import { rm } from 'fs/promises';
import { createLogger } from '@chialab/rna-logger';
import { rnaPlugin, useRna, hasPlugin } from '@chialab/esbuild-rna';
import { loaders } from './loaders.js';
import { writeManifestJson } from './writeManifestJson.js';
import { writeEntrypointsJson } from './writeEntrypointsJson.js';

/**
 * @typedef {import('esbuild').Metafile} Metafile
 */

/**
 * @typedef {import('esbuild').BuildResult & { metafile: Metafile, dependencies: import('@chialab/esbuild-rna').DependenciesMap, outputFiles?: import('esbuild').OutputFile[] }} BuildResult
 */

/**
 * @param {import('@chialab/rna-config-loader').EntrypointFinalBuildConfig} config
 * @param {{ stdin?: import('esbuild').StdinOptions; entryPoints?: string[] }} entryOptions
 * @param {import('esbuild').BuildResult} result
 */
async function onBuildEnd(config, entryOptions, result) {
    const {
        root,
        publicPath,
        format,
        manifestPath,
        entrypointsPath,
    } = config;

    if (manifestPath && result) {
        await writeManifestJson(result, manifestPath, publicPath);
    }
    if (entrypointsPath && entryOptions.entryPoints && result) {
        await writeEntrypointsJson(entryOptions.entryPoints, result, root, entrypointsPath, publicPath, format);
    }
}

/**
 * Build and bundle sources.
 * @param {import('@chialab/rna-config-loader').EntrypointFinalBuildConfig} config
 * @return {Promise<BuildResult>} The esbuild bundle result.
 */
export async function build(config) {
    const { default: esbuild } = await import('esbuild');
    const logger = createLogger();
    const hasOutputFile = !!path.extname(config.output);

    const {
        input,
        output,
        root: rootDir,
        code,
        loader,
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
        jsxFactory,
        jsxFragment,
        jsxModule,
        jsxExport,
        plugins,
        logLevel,
        clean,
        watch,
        write = true,
    } = config;

    const entryOptions = {};
    if (code) {
        entryOptions.stdin = {
            contents: code,
            loader,
            resolveDir: rootDir,
            sourcefile: Array.isArray(input) ? input[0] : input,
        };
    } else if (input) {
        entryOptions.entryPoints = Array.isArray(input) ? input : [input];
    }

    const outputDir = hasOutputFile ? path.dirname(output) : output;
    if (clean) {
        await rm(path.resolve(rootDir, outputDir), { recursive: true, force: true });
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
        !hasPlugin(plugins, 'alias') &&
            import('@chialab/esbuild-plugin-alias')
                .then(({ default: plugin }) => plugin(alias)),
        !hasPlugin(plugins, 'any-file') &&
            import('@chialab/esbuild-plugin-any-file')
                .then(({ default: plugin }) => plugin()),
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
                    dependencies: !bundle,
                    peerDependencies: !bundle,
                    optionalDependencies: !bundle,
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
        ...plugins,
    ].filter(Boolean)));

    /**
     * @type {import('esbuild').BuildOptions}
     */
    const finalConfig = {
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
        treeShaking: minify ? true : undefined,
        define,
        external,
        mainFields: [
            'module',
            'esnext',
            'jsnext',
            'jsnext:main',
            ...(platform === 'browser' ? ['browser'] : []),
            'main',
        ],
        jsxFactory,
        jsxFragment,
        loader: loaders,
        preserveSymlinks: true,
        sourcesContent: true,
        plugins: finalPlugins,
        logLevel,
        absWorkingDir: rootDir,
        watch: watch && {
            onRebuild(error, result) {
                if (result) {
                    onBuildEnd(config, entryOptions, result);
                }
                if (typeof watch === 'object' &&
                    typeof watch.onRebuild === 'function') {
                    return watch.onRebuild(error, result);
                } else if (error) {
                    logger.error(error);
                }
            },
        },
        write,
        allowOverwrite: !write,
    };

    const result = /** @type {BuildResult} */ (await esbuild.build(finalConfig));

    await onBuildEnd(config, entryOptions, result);

    const dependencies = useRna(/** @type {import('esbuild').PluginBuild} */(pluginBuild))
        .mergeDependencies(result);

    return {
        ...result,
        dependencies,
    };
}
