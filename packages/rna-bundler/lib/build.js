import { promises } from 'fs';
import path from 'path';
import { loaders } from './loaders.js';
import { emptyDir } from './emptyDir.js';
import { saveManifestJson } from './saveManifestJson.js';
import { saveEntrypointsJson } from './saveEntrypointsJson.js';

const { readFile, rename, rm } = promises;

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
        external,
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
        await emptyDir(outputDir);
    }

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
                extraTransformPlugins.push(
                    (await import('@chialab/esbuild-plugin-alias')).default(packageJson.browser)
                );
            }
        }
    }

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
        plugins: [
            (await import('@chialab/esbuild-plugin-any-file')).default(),
            (await import('@chialab/esbuild-plugin-env')).default(),
            (await import('@chialab/esbuild-plugin-jsx-import')).default({ jsxModule, jsxExport }),
            ...plugins,
            (await import('@chialab/esbuild-plugin-transform')).default([
                ...extraTransformPlugins,
                ...transformPlugins,
                (await import('@chialab/esbuild-plugin-meta-url')).default(),
            ]),
        ],
        logLevel,
    });

    if (manifestPath && result) {
        saveManifestJson(result, manifestPath, publicPath);
    }
    if (entrypointsPath && result) {
        saveEntrypointsJson(entryOptions.entryPoints, result, root, entrypointsPath, publicPath, format);
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
                await rename(
                    outputKey,
                    newOutputKey
                );

                result.metafile.outputs[newOutputKey] = output;
                delete result.metafile.outputs[outputKey];

                break;
            }
        }
    }

    return result;
}
