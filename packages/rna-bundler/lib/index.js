import path from 'path';
import { promises } from 'fs';
import { loaders } from './loaders.js';
import { emptyDir } from './emptyDir.js';
import { camelize } from './camelize.js';
import { saveManifestJson } from './saveManifestJson.js';
import { saveEndpointsJson, saveDevEndpointsJson } from './saveEndpointsJson.js';

const { readFile } = promises;

export { loaders, saveManifestJson, saveEndpointsJson, saveDevEndpointsJson };

/**
 * @typedef {Object} JSXOptions
 * @property {string} pragma The jsx pragma to use.
 * @property {string} [pragmaFrag] The jsx pragma to use for fragments.
 */

/**
 * @typedef {Omit<import('esbuild').BuildOptions, 'loader'> & { output: string, root?: string, input?: string|string[], code?: string, loader?: import('esbuild').Loader, name?: string, jsx?: JSXOptions, metafile?: boolean|string, clean?: boolean }} BuildConfig
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
    const { default: browserslist } = await import('browserslist');

    let {
        root = process.cwd(),
        input,
        code,
        output,
        loader = 'tsx',
        format = 'esm',
        platform = format === 'cjs' ? 'node' : 'browser',
        globalName = camelize(output),
        jsx,
        target,
        publicPath,
        entryNames = '[name]',
        metafile = false,
        clean = false,
        bundle = false,
        sourcemap = true,
        minify = false,
        watch = false,
    } = config;

    let hasOutputFile = !!path.extname(output);
    let outputDir = hasOutputFile ? path.dirname(output) : output;
    if (clean) {
        await emptyDir(outputDir);
    }

    target = target ?
        browserslist(target)
            .filter((entry) => ['chrome', 'firefox', 'safari', 'edge', 'node'].includes(entry.split(' ')[0]))
            .map((entry) => entry.split(' ').join('')) :
        ['es2020'];

    let entryOptions = {};
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

    /**
     * @type {string[]}
     */
    let external = [];
    if (!bundle) {
        let packageFile = await pkgUp({
            cwd: root,
        });
        if (packageFile) {
            let packageJson = JSON.parse(await readFile(packageFile, 'utf-8'));
            external = [
                ...external,
                ...Object.keys(packageJson.dependencies || {}),
                ...Object.keys(packageJson.peerDependencies || {}),
            ];
        }
    }

    let result = await esbuild.build({
        ...entryOptions,
        globalName,
        outfile: hasOutputFile ? output : undefined,
        outdir: hasOutputFile ? undefined : output,
        entryNames,
        assetNames: entryNames,
        splitting: format === 'esm' && !hasOutputFile,
        target,
        bundle: true,
        sourcemap,
        minify,
        platform,
        format,
        external,
        metafile,
        jsxFactory: jsx && jsx.pragma || undefined,
        jsxFragment: jsx && jsx.pragmaFrag || undefined,
        mainFields: ['module', 'jsnext', 'jsnext:main', 'main'],
        loader: loaders,
        watch: watch && {
            onRebuild(error, result) {
                if (error) {
                    // eslint-disable-next-line
                    console.error(error);
                }

                if (metafile && result) {
                    let metaDir = typeof metafile === 'string' ? metafile : outputDir;
                    saveManifestJson(result, metaDir, publicPath);
                    saveEndpointsJson(entryOptions.entryPoints, result, root, metaDir, publicPath, { format });
                }
            },
        },
        plugins: [
            (await import('@chialab/esbuild-plugin-env')).envPlugin(),
            (await import('@chialab/esbuild-plugin-any-file')).filePlugin(),
            (await import('@chialab/esbuild-plugin-html')).htmlPlugin(),
            (await import('@chialab/esbuild-plugin-postcss')).postcssPlugin(),
            (await import('esbuild-plugin-pipe')).default({
                plugins: [
                    (await import('@chialab/esbuild-plugin-meta-url')).urlPlugin(),
                    (await import('@chialab/esbuild-plugin-webpack-include')).webpackIncludePlugin(),
                ],
            }),
        ],
    });

    if (metafile) {
        let metaDir = typeof metafile === 'string' ? metafile : outputDir;
        await saveManifestJson(result, metaDir, publicPath);
        await saveEndpointsJson(entryOptions.entryPoints, result, root, metaDir, publicPath, { format });
    }

    return result;
}
