import { access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { hasPlugin } from '@chialab/esbuild-rna';
import esbuild from 'esbuild';
import { resolveSourceFile } from './helpers.js';
import { transformLoaders } from './loaders.js';

/**
 * @typedef {import('@chialab/esbuild-rna').Result & { code: string; map?: string }} TransformResult
 */

/**
 * Recursively find the nearest tsconfig.json file for a given file path, using a cache to avoid redundant filesystem checks.
 * @param {string} filePath The file path to start searching from.
 * @return {Promise<string | null>} The path to the nearest tsconfig.json file, or null if not found.
 */
const findTsConfigWithCache = (() => {
    const cache = new Map();

    /**
     * @param {string} filePath
     * @returns {Promise<boolean>} Whether the file exists or not.
     */
    const fileExists = async (filePath) => {
        try {
            await access(filePath);
            return true;
        } catch {
            return false;
        }
    };

    /**
     * Check if two paths are the same after resolving them to their absolute forms.
     * @param {string} pathA
     * @param {string} pathB
     * @returns {boolean} Whether the paths are the same.
     */
    const isSamePath = (pathA, pathB) => path.resolve(pathA) === path.resolve(pathB);

    /**
     * @param {string} filePath
     * @param {string} until
     * @param {string[]} checked
     * @returns {Promise<string | null>} The tsconfig path, or null if not found.
     */
    return async function recursiveFind(filePath, until, checked = []) {
        if (isSamePath(filePath, until)) {
            return null;
        }
        const dir = path.dirname(filePath);
        if (cache.has(dir)) {
            return cache.get(dir);
        }

        const tsconfigPath = path.join(dir, 'tsconfig.json');
        if (await fileExists(tsconfigPath)) {
            for (const checkedDir of checked) {
                cache.set(checkedDir, tsconfigPath);
            }
            cache.set(dir, tsconfigPath);
            return tsconfigPath;
        }

        return recursiveFind(dir, until, [...checked, dir]);
    };
})();

/**
 * Build and bundle sources.
 * @param {import('@chialab/rna-config-loader').EntrypointConfig} config
 * @returns {Promise<TransformResult>} The esbuild bundle result.
 */
export async function transform(config) {
    const {
        input,
        code,
        root: rootDir = process.cwd(),
        loader,
        format,
        platform,
        target,
        sourcemap,
        bundle = false,
        minify,
        globalName,
        define,
        jsx,
        jsxFactory,
        jsxFragment,
        jsxImportSource,
        plugins = [],
        logLevel,
        resolveExtensions,
        conditions,
        publicPath,
        inject,
        banner,
        footer,
        tsconfig,
        tsconfigRaw,
    } = config;

    if (code == null) {
        throw new Error('Missing required `code` option');
    }

    const finalPlugins = /** @type {import('esbuild').Plugin[]} */ (
        await Promise.all(
            [
                !hasPlugin(plugins, 'env') &&
                    import('@chialab/esbuild-plugin-env').then(({ default: plugin }) => plugin()),
                !hasPlugin(plugins, 'commonjs') &&
                    import('@chialab/esbuild-plugin-commonjs').then(({ default: plugin }) => plugin()),
                !hasPlugin(plugins, 'worker') &&
                    import('@chialab/esbuild-plugin-worker').then(({ default: plugin }) =>
                        plugin({
                            emit: false,
                        })
                    ),
                !hasPlugin(plugins, 'meta-url') &&
                    import('@chialab/esbuild-plugin-meta-url').then(({ default: plugin }) =>
                        plugin({
                            emit: false,
                        })
                    ),
                ...plugins,
                !hasPlugin(plugins, 'any-file') &&
                    import('@chialab/esbuild-plugin-any-file').then(({ default: plugin }) => plugin()),
            ].filter(Boolean)
        )
    );

    const sourceFile = path.resolve(rootDir, resolveSourceFile(input));
    const absWorkingDir = path.dirname(sourceFile);
    const result = /** @type {import('@chialab/esbuild-rna').Result} */ (
        await esbuild.build({
            stdin: {
                contents: code,
                resolveDir: rootDir,
                sourcefile: sourceFile,
            },
            absWorkingDir,
            outdir: absWorkingDir,
            allowOverwrite: true,
            write: false,
            bundle,
            globalName,
            target,
            platform,
            sourcemap,
            minify,
            format,
            define,
            jsx,
            jsxImportSource,
            jsxFactory,
            jsxFragment,
            loader: {
                ...transformLoaders,
                ...(loader || {}),
            },
            metafile: true,
            preserveSymlinks: true,
            sourcesContent: true,
            plugins: finalPlugins,
            logLevel,
            resolveExtensions,
            conditions,
            publicPath,
            inject,
            banner,
            footer,
            tsconfig:
                tsconfig || (tsconfigRaw ? undefined : (await findTsConfigWithCache(sourceFile, rootDir)) || undefined),
            tsconfigRaw,
        })
    );

    const outputFiles = /** @type {import('esbuild').OutputFile[]} */ (result.outputFiles);

    return {
        ...result,
        code: outputFiles[0].text,
        map: outputFiles[1] ? outputFiles[1].text : '',
    };
}
