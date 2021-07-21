import { promises } from 'fs';
import path from 'path';
import { loaders } from './loaders.js';
import { emptyDir } from './emptyDir.js';
import { camelize } from './camelize.js';
import { saveManifestJson } from './saveManifestJson.js';
import { saveEntrypointsJson } from './saveEntrypointsJson.js';

const { readFile, rename } = promises;

/**
 * @typedef {Omit<import('esbuild').BuildOptions, 'loader'> & { output: string, root?: string, input?: string|string[], code?: string, loader?: import('esbuild').Loader, jsxModule?: string, jsxExport?: 'default'|'named'|'namespace', transformPlugins?: import('esbuild').Plugin[], manifest?: boolean|string, entrypoints?: boolean|string, clean?: boolean }} BuildConfig
 */

/**
 * @typedef {import('esbuild').BuildResult & { outputFiles?: import('esbuild').OutputFile[] }} BuildResult
 */

/**
 * Build and bundle sources.
 * @param {BuildConfig} config
 * @return {Promise<BuildResult>} The esbuild bundle result.
 */
export async function build(config) {
    const { default: esbuild } = await import('esbuild');
    const { default: pkgUp } = await import('pkg-up');

    const {
        root = process.cwd(),
        input,
        code,
        output,
        bundle = false,
        sourcemap = true,
        minify = false,
        loader = 'tsx',
        format = 'esm',
        platform = format === 'cjs' ? 'node' : 'browser',
        globalName = format === 'iife' ? camelize(output) : undefined,
        jsxFactory,
        jsxFragment,
        jsxModule,
        jsxExport,
        target = format === 'iife' ? 'es5' : 'es2020',
        publicPath,
        entryNames,
        assetNames,
        chunkNames,
        external = [],
        manifest = false,
        entrypoints = false,
        clean = false,
        watch = false,
        plugins = [],
        transformPlugins = [],
        ...others
    } = config;

    const hasOutputFile = !!path.extname(output);
    const outputDir = hasOutputFile ? path.dirname(output) : output;
    if (clean) {
        await emptyDir(outputDir);
    }

    const entryOptions = {};
    if (code) {
        entryOptions.stdin = {
            contents: code,
            loader: /** @type {import('esbuild').Loader} */ (`${loader}`),
            resolveDir: root,
            sourcefile: Array.isArray(input) ? input[0] : input,
        };
    } else if (input) {
        entryOptions.entryPoints = Array.isArray(input) ? input : [input];
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
        globalName,
        outfile: hasOutputFile ? output : undefined,
        outdir: hasOutputFile ? undefined : output,
        entryNames,
        assetNames,
        chunkNames,
        splitting: format === 'esm' && !hasOutputFile,
        target,
        bundle: true,
        sourcemap,
        minify,
        platform,
        format,
        external,
        metafile: true,
        jsxFactory,
        jsxFragment,
        mainFields: [
            'module',
            'esnext',
            'jsnext',
            'jsnext:main',
            ...(platform === 'browser' ? ['browser'] : []),
            'main',
        ],
        loader: loaders,
        watch: watch && {
            onRebuild(error, result) {
                if (error) {
                    // eslint-disable-next-line
                    console.error(error);
                }

                if (manifest && result) {
                    saveManifestJson(result, typeof manifest === 'string' ? manifest : outputDir, publicPath);
                }
                if (entrypoints && result) {
                    saveEntrypointsJson(entryOptions.entryPoints, result, root, typeof entrypoints === 'string' ? entrypoints : outputDir, publicPath, format);
                }
            },
        },
        plugins: [
            (await import('@chialab/esbuild-plugin-any-file')).default(),
            (await import('@chialab/esbuild-plugin-env')).default(),
            (await import('@chialab/esbuild-plugin-jsx-import')).default({ jsxModule, jsxExport }),
            ...plugins,
            (await import('@chialab/esbuild-plugin-transform')).default([
                ...extraTransformPlugins,
                ...transformPlugins,
                (await import('@chialab/esbuild-plugin-require-resolve')).default(),
                (await import('@chialab/esbuild-plugin-meta-url')).default(),
            ]),
        ],
        ...others,
    });

    if (manifest && result) {
        saveManifestJson(result, typeof manifest === 'string' ? manifest : outputDir, publicPath);
    }
    if (entrypoints && result) {
        saveEntrypointsJson(entryOptions.entryPoints, result, root, typeof entrypoints === 'string' ? entrypoints : outputDir, publicPath, format);
    }

    if (result.metafile) {
        for (const outputKey in result.metafile.outputs) {
            const output = result.metafile.outputs[outputKey];
            if (path.extname(outputKey) !== '.html') {
                continue;
            }
            if (!output.inputs) {
                continue;
            }
            for (const inputKey in output.inputs) {
                if (path.extname(inputKey) !== '.html') {
                    continue;
                }

                await rename(
                    outputKey,
                    path.join(path.dirname(outputKey), path.basename(inputKey))
                );

                break;
            }
        }
    }

    return result;
}
