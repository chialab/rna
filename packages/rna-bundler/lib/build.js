import path from 'path';
import { readFile, rename, rm } from 'fs/promises';
import { createLogger } from '@chialab/rna-logger';
import { loaders } from './loaders.js';
import { writeManifestJson } from './writeManifestJson.js';
import { writeEntrypointsJson } from './writeEntrypointsJson.js';

/**
 * @typedef {import('esbuild').BuildResult & { outputFiles?: import('esbuild').OutputFile[] }} BuildResult
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
    const { default: pkgUp } = await import('pkg-up');
    const logger = createLogger();

    const {
        input,
        output,
        root,
        code,
        loader,
        format,
        target,
        platform,
        sourcemap,
        minify,
        bundle,
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
        transformPlugins,
        logLevel,
        clean,
        watch,
    } = config;

    const hasOutputFile = !!path.extname(output);

    const entryOptions = {};
    if (code) {
        entryOptions.stdin = {
            contents: code,
            loader,
            resolveDir: root,
            sourcefile: Array.isArray(input) ? input[0] : input,
        };
    } else if (input) {
        entryOptions.entryPoints = Array.isArray(input) ? input : [input];
    }

    const outputDir = hasOutputFile ? path.dirname(output) : output;
    if (clean) {
        await rm(path.resolve(root, outputDir), { recursive: true, force: true });
    }

    /**
     * @type {import('esbuild').Plugin[]}
     */
    const extraTransformPlugins = [];

    if (!bundle) {
        const packageFile = await pkgUp({
            cwd: root,
        });
        if (packageFile) {
            const packageJson = JSON.parse(await readFile(packageFile, 'utf-8'));
            external.push(
                ...Object.keys(packageJson.dependencies || {}),
                ...Object.keys(packageJson.peerDependencies || {}),
                ...Object.keys(packageJson.optionalDependencies || {})
            );
        }
    }

    if (platform === 'browser') {
        const packageFile = await pkgUp({
            cwd: root,
        });
        if (packageFile) {
            const packageJson = JSON.parse(await readFile(packageFile, 'utf-8'));
            if (typeof packageJson.browser === 'object') {
                Object.assign(alias, packageJson.browser);
            }
        }
    }

    if (Object.keys(alias).length) {
        extraTransformPlugins.push(
            (await import('@chialab/esbuild-plugin-alias')).default(alias)
        );
    }

    const finalPlugins = await Promise.all([
        import('@chialab/esbuild-plugin-emit').then(({ default: plugin }) => plugin()),
        import('@chialab/esbuild-plugin-any-file')
            .then(({ default: plugin }) =>
                plugin({
                    fsCheck: true,
                    shouldThrow(args) {
                        return !args.path.includes('/node_modules/');
                    },
                })
            ),
        import('@chialab/esbuild-plugin-env').then(({ default: plugin }) => plugin()),
        import('@chialab/esbuild-plugin-jsx-import').then(({ default: plugin }) => plugin({ jsxModule, jsxExport })),
        ...plugins,
        import('@chialab/esbuild-plugin-transform')
            .then(async ({ default: plugin }) =>
                plugin([
                    ...extraTransformPlugins,
                    ...transformPlugins,
                ])
            ),
    ]);

    const result = await esbuild.build({
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
        splitting: format === 'esm' && !hasOutputFile,
        metafile: true,
        bundle: true,
        treeShaking: minify ? true : undefined,
        define: {
            this: platform === 'browser' ? 'window' : 'undefined',
            ...define,
        },
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
        absWorkingDir: root,
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
    });

    await onBuildEnd(config, entryOptions, result);

    return result;
}
