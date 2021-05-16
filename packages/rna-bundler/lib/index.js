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
 * @typedef {Omit<import('esbuild').BuildOptions, 'loader'> & { output: string, root?: string, input?: string|string[], code?: string, loader?: import('esbuild').Loader, jsx?: JSXOptions, transformPlugins?: import('esbuild').Plugin[], metafile?: boolean|string, clean?: boolean }} BuildConfig
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
        jsx,
        target = format === 'iife' ? 'es5' : 'es2020',
        publicPath,
        entryNames = minify ? '[name]-[hash]' : '[name]',
        assetNames = minify ? '[name]-[hash]' : '[name]',
        chunkNames = minify ? '[name]-[hash]' : '[name]',
        external = [],
        metafile = false,
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
            extraTransformPlugins.push(
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
            (await import('@chialab/esbuild-plugin-jsx-import')).default(jsx && jsx.import),
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

    if (metafile) {
        const metaDir = typeof metafile === 'string' ? metafile : outputDir;
        await saveManifestJson(result, metaDir, publicPath);
        await saveEndpointsJson(entryOptions.entryPoints, result, root, metaDir, publicPath, { format });
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
        .option('-O, --output <path>', 'output directory or file')
        .option('--format <type>', 'bundle format')
        .option('--platform <type>', 'platform destination')
        .option('--bundle', 'bundle dependencies')
        .option('--minify', 'minify the build')
        .option('--watch', 'keep build alive')
        .option('--public <path>', 'public path')
        .option('--target <query>', 'output targets (es5, es2015, es2020)')
        .option('--entryNames <pattern>', 'output file names')
        .option('--clean', 'cleanup output path')
        .option('--metafile [path]', 'generate manifest and endpoints maps')
        .option('--name <identifier>', 'the iife global name')
        .option('--external [modules]', 'comma separated external packages')
        .option('--no-map', 'do not generate sourcemaps')
        .option('--jsxPragma <identifier>', 'jsx pragma')
        .option('--jsxFragment <identifier>', 'jsx fragment')
        .option('--jsxModule <name>', 'jsx module name')
        .option('--jsxExport <type>', 'jsx export mode')
        .action(
            /**
             * @param {string[]} input
             * @param {{ output: string, format?: import('esbuild').Format, platform: import('esbuild').Platform, bundle?: boolean, minify?: boolean, name?: string, watch?: boolean, metafile?: boolean, target?: string, public?: string, entryNames?: string, clean?: boolean, external?: string, map?: boolean, jsxPragma?: string, jsxFragment?: string, jsxModule?: string, jsxExport?: 'named'|'namespace'|'default' }} options
             */
            async (input, { output, format = 'esm', platform, bundle, minify, name, watch, metafile, target, public: publicPath, entryNames, clean, external, map, jsxPragma, jsxFragment, jsxModule, jsxExport }) => {
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
                    metafile,
                    external: external ? external.split(',') : undefined,
                    publicPath: publicPath ? path.resolve(publicPath) : undefined,
                    entryNames,
                    sourcemap: map,
                    jsx: jsxPragma ? {
                        pragma: jsxPragma,
                        pragmaFrag: jsxFragment,
                        import: jsxModule ? {
                            module: jsxModule,
                            export: jsxExport,
                        } : undefined,
                    } : undefined,
                    plugins,
                    transformPlugins,
                });
            }
        );
}
