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
 * @typedef {Object} JSXImport
 * @property {string} module The module name.
 * @property {'named'|'namespace'|'default'} [export] The export mode of the jsc pragma.
 */

/**
 * @typedef {Object} JSXOptions
 * @property {string} pragma The jsx pragma to use.
 * @property {string} [pragmaFrag] The jsx pragma to use for fragments.
 * @property {JSXImport} [import] The jsx import reference.
 */

/**
 * @typedef {Omit<import('esbuild').BuildOptions, 'loader'> & { output: string, root?: string, input?: string|string[], code?: string, loader?: import('esbuild').Loader, jsx?: JSXOptions, metafile?: boolean|string, clean?: boolean }} BuildConfig
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
        loader = 'tsx',
        format = 'esm',
        platform = format === 'cjs' ? 'node' : 'browser',
        globalName = camelize(output),
        jsx,
        target = format === 'iife' ? 'es5' : 'es2020',
        publicPath,
        entryNames = '[name]',
        external = [],
        metafile = false,
        clean = false,
        bundle = false,
        sourcemap = true,
        minify = false,
        watch = false,
        plugins = [],
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

    const extraPlugins = [];

    if (!bundle) {
        const packageFile = await pkgUp({
            cwd: root,
        });
        if (packageFile) {
            const packageJson = JSON.parse(await readFile(packageFile, 'utf-8'));
            external.push(
                ...Object.keys(packageJson.dependencies || {}),
                ...Object.keys(packageJson.peerDependencies || {})
            );
        }
    }
    if (platform === 'browser') {
        const packageFile = await pkgUp({
            cwd: root,
        });
        const packageJson = packageFile ? JSON.parse(await readFile(packageFile, 'utf-8')) : {};
        if (typeof packageJson.browser === 'object') {
            extraPlugins.push(
                (await import('@chialab/esbuild-plugin-alias')).default(packageJson.browser)
            );
        }
        external.push(
            ...Object.keys(packageJson.dependencies || {}),
            ...Object.keys(packageJson.peerDependencies || {})
        );
    }

    const result = await esbuild.build({
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
        mainFields: ['module', 'esnext', 'jsnext', 'jsnext:main', 'main'],
        loader: loaders,
        watch: watch && {
            onRebuild(error, result) {
                if (error) {
                    // eslint-disable-next-line
                    console.error(error);
                }

                if (metafile && result) {
                    const metaDir = typeof metafile === 'string' ? metafile : outputDir;
                    saveManifestJson(result, metaDir, publicPath);
                    saveEndpointsJson(entryOptions.entryPoints, result, root, metaDir, publicPath, { format });
                }
            },
        },
        plugins: [
            (await import('@chialab/esbuild-plugin-any-file')).default(),
            (await import('@chialab/esbuild-plugin-env')).default(),
            (await import('@chialab/esbuild-plugin-html')).default({ esbuild }),
            (await import('@chialab/esbuild-plugin-postcss')).default(),
            (await import('@chialab/esbuild-plugin-jsx-import')).default(jsx && jsx.import),
            (await import('@chialab/esbuild-plugin-transform')).start(),
            (await import('@chialab/esbuild-plugin-commonjs')).default({ esbuild }),
            (await import('@chialab/esbuild-plugin-require-resolve')).default(),
            (await import('@chialab/esbuild-plugin-webpack-include')).default(),
            (await import('@chialab/esbuild-plugin-meta-url')).default(),
            ...extraPlugins,
            ...plugins,
            (await import('@chialab/esbuild-plugin-transform')).end(),
        ],
    });

    if (metafile) {
        const metaDir = typeof metafile === 'string' ? metafile : outputDir;
        await saveManifestJson(result, metaDir, publicPath);
        await saveEndpointsJson(entryOptions.entryPoints, result, root, metaDir, publicPath, { format });
    }

    return result;
}
