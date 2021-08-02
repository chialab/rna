import os from 'os';
import path from 'path';
import { browserResolve, isCore } from '@chialab/node-resolve';
import { getEntryBuildConfig, mergeConfig, readConfigFile, locateConfigFile } from '@chialab/rna-config-loader';
import { createLogger, readableSize } from '@chialab/rna-logger';
import { build } from './build.js';
import { writeManifestJson } from './writeManifestJson.js';
import { writeEntrypointsJson, writeDevEntrypointsJson } from './writeEntrypointsJson.js';
import { loadPlugins, loadTransformPlugins } from './loadPlugins.js';
import { Queue } from './Queue.js';
import { writeMetafile } from './writeMetafile.js';
import { bundleSize } from './bundleSize.js';
import { mergeMetafiles } from './mergeMetafiles.js';

export * from './loaders.js';
export * from './transform.js';
export * from './build.js';
export { loadPlugins, loadTransformPlugins, writeManifestJson, writeEntrypointsJson, writeDevEntrypointsJson };

/**
 * @param {import('commander').Command} program
 */
export function command(program) {
    program
        .command('build [entry...]', { isDefault: true })
        .description('Compile JS and CSS modules using esbuild (https://esbuild.github.io/). It can output multiple module formats and it can be used to build a single module or to bundle all dependencies of an application.')
        .option('-C, --config <path>', 'the rna config file')
        .option('-O, --output <path>', 'output directory or file')
        .option('--format <type>', 'bundle format')
        .option('--platform <type>', 'platform destination')
        .option('--bundle', 'bundle dependencies')
        .option('--minify', 'minify the build')
        .option('--public <path>', 'public path')
        .option('--target <query>', 'output targets (es5, es2015, es2020)')
        .option('--no-map', 'do not generate sourcemaps')
        .option('--entryNames <pattern>', 'output file names')
        .option('--chunkNames <pattern>', 'output chunk names')
        .option('--assetNames <pattern>', 'output asset names')
        .option('--clean', 'cleanup output path')
        .option('--manifest <path>', 'generate manifest file')
        .option('--entrypoints <path>', 'generate entrypoints file')
        .option('--name <identifier>', 'the iife global name')
        .option('--external [modules]', 'comma separated external packages')
        .option('--metafile <path>', 'write JSON metadata file about the build')
        .option('--show-compressed', 'show compressed size of files in build summary')
        .option('--jsxFactory <identifier>', 'jsx pragma')
        .option('--jsxFragment <identifier>', 'jsx fragment')
        .option('--jsxModule <name>', 'jsx module name')
        .option('--jsxExport <type>', 'jsx export mode')
        .action(
            /**
             * @param {string[]} input
             * @param {{ config?: string, output: string, format?: import('@chialab/rna-config-loader').Format, target?: import('@chialab/rna-config-loader').Target, platform: import('@chialab/rna-config-loader').Platform, bundle?: boolean, minify?: boolean, name?: string, manifest?: boolean|string, entrypoints?: boolean|string, public?: string, entryNames?: string, chunkNames?: string, assetNames?: string, clean?: boolean, external?: string, map?: boolean, jsxFactory?: string, jsxFragment?: string, jsxModule?: string, jsxExport?: 'named'|'namespace'|'default', metafile?: string, showCompressed?: boolean }} options
             */
            async (input, { config: configFile, output, format = 'esm', platform, bundle, minify, name, manifest: manifestFile, entrypoints: entrypointsFile, target, public: publicPath, entryNames, chunkNames, assetNames, clean, external: externalString, map: sourcemap, jsxFactory, jsxFragment, jsxModule, jsxExport, metafile, showCompressed }) => {
                if (sourcemap === true) {
                    sourcemap = undefined;
                }

                const logger = createLogger();
                const { default: esbuild } = await import('esbuild');
                const manifestPath = manifestFile ? (typeof manifestFile === 'string' ? manifestFile : path.join(output, 'manifest.json')) : undefined;
                const entrypointsPath = entrypointsFile ? (typeof entrypointsFile === 'string' ? entrypointsFile : path.join(output, 'entrypoints.json')) : undefined;
                const external = externalString ? externalString.split(',') : [];

                /** @type {import('esbuild').Metafile[]} */
                const bundleMetafiles = [];

                /**
                 * @type {import('@chialab/rna-config-loader').Config}
                 */
                const inputConfig = {
                    format,
                    platform,
                    minify,
                    target,
                    clean,
                    bundle,
                    manifestPath,
                    entrypointsPath,
                    external,
                    publicPath,
                    entryNames,
                    chunkNames,
                    assetNames,
                    sourcemap,
                    jsxFactory,
                    jsxFragment,
                    jsxModule,
                    jsxExport,
                };

                configFile = configFile || await locateConfigFile();

                /**
                 * @type {import('@chialab/rna-config-loader').Config}
                 */
                const userConfig = mergeConfig(configFile ? await readConfigFile(configFile, inputConfig, 'build') : {}, inputConfig, input && input.length ? {
                    entrypoints: [{
                        input: input.map((entry) => path.resolve(entry)),
                        output: path.resolve(output),
                        globalName: name,
                    }],
                    ...inputConfig,
                } : {});

                /**
                 * @type {import('@chialab/rna-config-loader').Config}
                 */
                const config = mergeConfig(userConfig, {
                    plugins: await loadPlugins({
                        html: {},
                        postcss: {
                            relative: false,
                        },
                    }, esbuild),
                    transformPlugins: await loadTransformPlugins({
                        commonjs: userConfig.platform === 'browser' ? {
                            ignore: async (specifier, { source }) => {
                                if (source) {
                                    try {
                                        await browserResolve(specifier, source);
                                        return false;
                                    } catch (err) {
                                        //
                                    }
                                }

                                return isCore(specifier);
                            },
                        } : {},
                    }),
                });

                const { entrypoints } = config;

                if (!entrypoints) {
                    throw new Error('Missing entrypoints.');
                }

                const queue = new Queue();
                for (let i = 0; i < entrypoints.length; i++) {
                    const entrypoint = entrypoints[i];
                    queue.add(async () => {
                        const result = await build(getEntryBuildConfig(entrypoint, config));
                        if (result.metafile) {
                            bundleMetafiles[i] = result.metafile;
                        }
                    });
                }

                await queue.run(os.cpus().length);

                const finalMetafile = mergeMetafiles(...bundleMetafiles);
                if (typeof metafile === 'string') {
                    await writeMetafile(finalMetafile, path.resolve(process.cwd(), metafile));
                }

                if (Object.keys(finalMetafile.outputs).length) {
                    const sizes = await bundleSize(finalMetafile, showCompressed);
                    logger.log('Generated bundle files:\n');
                    logger.files(sizes, showCompressed ? ['size', 'gzip', 'brotli'] : ['size'], {
                        size: readableSize,
                        gzip: readableSize,
                        brotli: readableSize,
                    });
                } else {
                    logger.log('Empty bundle.');
                }
            }
        );
}
