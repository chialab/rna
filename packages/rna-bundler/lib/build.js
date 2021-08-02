import { readFile, rename, rm } from 'fs/promises';
import path from 'path';
import { loaders } from './loaders.js';
import { writeManifestJson } from './writeManifestJson.js';
import { writeEntrypointsJson } from './writeEntrypointsJson.js';

/**
 * @typedef {import('esbuild').BuildResult & { outputFiles?: import('esbuild').OutputFile[] }} BuildResult
 */

/**
 * Build and bundle sources.
 * @param {import('@chialab/rna-config-loader').EntrypointFinalBuildConfig} config
 * @return {Promise<BuildResult>} The esbuild bundle result.
 */
export async function build(config) {
    const { default: esbuild } = await import('esbuild');
    const { default: pkgUp } = await import('pkg-up');

    const {
        input,
        output,
        root,
        code,
        loader,
        publicPath,
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
        manifestPath,
        entrypointsPath,
        logLevel,
        clean,
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
                    (await import('@chialab/esbuild-plugin-meta-url')).default(),
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
        sourcesContent: true,
        plugins: finalPlugins,
        logLevel,
        absWorkingDir: root,
    });

    if (manifestPath && result) {
        writeManifestJson(result, manifestPath, publicPath);
    }
    if (entrypointsPath && result) {
        writeEntrypointsJson(entryOptions.entryPoints, result, root, entrypointsPath, publicPath, format);
    }

    if (result.metafile) {
        const outputs = { ...result.metafile.outputs };
        for (const outputKey in outputs) {
            const output = outputs[outputKey];
            if (path.extname(outputKey) !== '.html') {
                if (output.entryPoint && path.extname(output.entryPoint) === '.html') {
                    await rm(outputKey);
                    delete result.metafile.outputs[outputKey];
                }
                continue;
            }
            for (const inputKey in output.inputs) {
                if (path.extname(inputKey) !== '.html') {
                    continue;
                }

                const newOutputKey = path.join(path.dirname(outputKey), path.basename(inputKey));
                if (newOutputKey === outputKey) {
                    continue;
                }

                await rename(
                    outputKey,
                    newOutputKey
                );

                delete result.metafile.outputs[outputKey];
                result.metafile.outputs[newOutputKey] = output;

                break;
            }
        }
    }

    return result;
}
