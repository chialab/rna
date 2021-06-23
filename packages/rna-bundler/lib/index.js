import path from 'path';
import { promises } from 'fs';
import { loaders } from './loaders.js';
import { emptyDir } from './emptyDir.js';
import { camelize } from './camelize.js';
import { saveManifestJson } from './saveManifestJson.js';
import { saveEntrypointsJson, saveDevEntrypointsJson } from './saveEntrypointsJson.js';

const { readFile } = promises;

export { loaders, saveManifestJson, saveEntrypointsJson, saveDevEntrypointsJson };

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
        globalName = camelize(output),
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
        metafile = false,
        manifest = false,
        entrypoints = false,
        clean = false,
        watch = false,
        plugins = [],
        transformPlugins = [],
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
        metafile: metafile || !!manifest || !!entrypoints,
        jsxFactory,
        jsxFragment,
        mainFields: ['module', 'esnext', 'jsnext', 'jsnext:main', 'main'],
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
            (await import('@chialab/esbuild-plugin-transform')).start(),
            (await import('@chialab/esbuild-plugin-commonjs')).default({ esbuild }),
            (await import('@chialab/esbuild-plugin-require-resolve')).default(),
            (await import('@chialab/esbuild-plugin-webpack-include')).default(),
            (await import('@chialab/esbuild-plugin-meta-url')).default(),
            ...extraTransformPlugins,
            ...transformPlugins,
            (await import('@chialab/esbuild-plugin-transform')).end(),
        ],
    });

    if (manifest && result) {
        saveManifestJson(result, typeof manifest === 'string' ? manifest : outputDir, publicPath);
    }
    if (entrypoints && result) {
        saveEntrypointsJson(entryOptions.entryPoints, result, root, typeof entrypoints === 'string' ? entrypoints : outputDir, publicPath, format);
    }

    return result;
}

/**
 * @param {import('commander').Command} program
 */
export function command(program) {
    program
        .command('build <entry...>', { isDefault: true })
        .description('Compile JS and CSS modules using esbuild (https://esbuild.github.io/). It can output multiple module formats and it can be used to build a single module or to bundle all dependencies of an application.')
        .requiredOption('-O, --output <path>', 'output directory or file')
        .option('--format <type>', 'bundle format')
        .option('--platform <type>', 'platform destination')
        .option('--bundle', 'bundle dependencies')
        .option('--minify', 'minify the build')
        .option('--watch', 'keep build alive')
        .option('--public <path>', 'public path')
        .option('--target <query>', 'output targets (es5, es2015, es2020)')
        .option('--entryNames <pattern>', 'output file names')
        .option('--clean', 'cleanup output path')
        .option('--manifest [path]', 'generate manifest file')
        .option('--entrypoints [path]', 'generate entrypoints file')
        .option('--name <identifier>', 'the iife global name')
        .option('--external [modules]', 'comma separated external packages')
        .option('--no-map', 'do not generate sourcemaps')
        .option('--jsxFactory <identifier>', 'jsx pragma')
        .option('--jsxFragment <identifier>', 'jsx fragment')
        .option('--jsxModule <name>', 'jsx module name')
        .option('--jsxExport <type>', 'jsx export mode')
        .action(
            /**
             * @param {string[]} input
             * @param {{ output: string, format?: import('esbuild').Format, platform: import('esbuild').Platform, bundle?: boolean, minify?: boolean, name?: string, watch?: boolean, manifest?: boolean|string, entrypoints?: boolean|string, target?: string, public?: string, entryNames?: string, clean?: boolean, external?: string, map?: boolean, jsxFactory?: string, jsxFragment?: string, jsxModule?: string, jsxExport?: 'named'|'namespace'|'default' }} options
             */
            async (input, { output, format = 'esm', platform, bundle, minify, name, watch, manifest, entrypoints, target, public: publicPath, entryNames, clean, external, map, jsxFactory, jsxFragment, jsxModule, jsxExport }) => {
                const { default: esbuild } = await import('esbuild');

                /**
                 * @type {import('esbuild').Plugin[]}
                 */
                const plugins = [];

                try {
                    plugins.push((await import('@chialab/esbuild-plugin-html')).default({ esbuild }));
                } catch (err) {
                    //
                }

                try {
                    plugins.push((await import('@chialab/esbuild-plugin-postcss')).default());
                } catch (err) {
                    //
                }

                /**
                 * @type {import('esbuild').Plugin[]}
                 */
                const transformPlugins = [];

                const loadBabelPlugin = async () => {
                    try {
                        return (await import('@chialab/esbuild-plugin-swc')).default();
                    } catch (err) {
                        //
                    }

                    return (await import('@chialab/esbuild-plugin-babel')).default();
                };

                try {
                    transformPlugins.push(await loadBabelPlugin());
                } catch (err) {
                    //
                }

                await build({
                    input: input.map((entry) => path.resolve(entry)),
                    output: path.resolve(output),
                    format,
                    platform,
                    globalName: name,
                    bundle,
                    minify,
                    target,
                    clean,
                    watch,
                    manifest,
                    entrypoints,
                    external: external ? external.split(',') : undefined,
                    publicPath,
                    entryNames,
                    sourcemap: map,
                    jsxFactory,
                    jsxFragment,
                    jsxModule,
                    jsxExport,
                    plugins,
                    transformPlugins,
                });
            }
        );
}
