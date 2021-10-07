import os from 'os';
import path from 'path';
import { assignToResult, createResult, remapResult } from '@chialab/esbuild-helpers';
import { getEntryBuildConfig, mergeConfig, readConfigFile, locateConfigFile } from '@chialab/rna-config-loader';
import { createLogger, readableSize } from '@chialab/rna-logger';
import { build } from './build.js';
import { writeManifestJson } from './writeManifestJson.js';
import { writeEntrypointsJson, writeDevEntrypointsJson } from './writeEntrypointsJson.js';
import { loadPlugins, loadTransformPlugins } from './loadPlugins.js';
import { Queue } from './Queue.js';
import { writeMetafile } from './writeMetafile.js';
import { bundleSize } from './bundleSize.js';

export * from './loaders.js';
export { transform } from './transform.js';
export { build } from './build.js';
export { loadPlugins, loadTransformPlugins, writeManifestJson, writeEntrypointsJson, writeDevEntrypointsJson };

/**
 * @typedef {import('./build').BuildResult} BuildResult
 */

/**
 * @typedef {import('./transform').TransformResult} TransformResult
 */

/**
 * @typedef {Object} BuildCommandOptions
 * @property {string} output
 * @property {string} [config]
 * @property {import('@chialab/rna-config-loader').Format} [format]
 * @property {import('@chialab/rna-config-loader').Target} [target]
 * @property {import('@chialab/rna-config-loader').Platform} [platform]
 * @property {boolean} [bundle]
 * @property {boolean} [minify]
 * @property {string} [name]
 * @property {boolean|string} [manifest]
 * @property {boolean|string} [entrypoints]
 * @property {string} [public]
 * @property {string} [entryNames]
 * @property {string} [chunkNames]
 * @property {string} [assetNames]
 * @property {boolean} [clean]
 * @property {string} [external]
 * @property {boolean} [map]
 * @property {string} [jsxFactory]
 * @property {string} [jsxFragment]
 * @property {string} [jsxModule]
 * @property {import('@chialab/rna-config-loader').ExportType} [jsxExport]
 * @property {string} [metafile]
 * @property {boolean} [showCompressed]
 * @property {boolean} [watch]
 */

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
        .option('-W, --watch', 'live re-build on sources changes')
        .action(
            /**
             * @param {string[]} input
             * @param {BuildCommandOptions} options
             */
            async (input, {
                config: configFile,
                output,
                format = 'esm',
                platform,
                bundle,
                minify,
                name,
                manifest: manifestFile,
                entrypoints: entrypointsFile,
                target,
                public: publicPath,
                entryNames,
                chunkNames,
                assetNames,
                clean,
                external: externalString,
                map: sourcemap,
                jsxFactory,
                jsxFragment,
                jsxModule,
                jsxExport,
                metafile: metafilePath,
                showCompressed,
                watch,
            }) => {
                if (sourcemap === true) {
                    sourcemap = undefined;
                }

                const logger = createLogger();
                const { default: esbuild } = await import('esbuild');
                const manifestPath = manifestFile ? (typeof manifestFile === 'string' ? manifestFile : path.join(output, 'manifest.json')) : undefined;
                const entrypointsPath = entrypointsFile ? (typeof entrypointsFile === 'string' ? entrypointsFile : path.join(output, 'entrypoints.json')) : undefined;
                const external = externalString ? externalString.split(',') : [];

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
                    watch,
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
                            alias: userConfig.alias,
                            relative: false,
                        },
                    }, esbuild),
                    transformPlugins: await loadTransformPlugins({
                        commonjs: {
                            helperModule: true,
                        },
                    }),
                });

                const { entrypoints } = config;

                if (!entrypoints) {
                    throw new Error('Missing entrypoints.');
                }

                const queue = new Queue();
                const cwd = process.cwd();
                for (let i = 0; i < entrypoints.length; i++) {
                    const entrypoint = entrypoints[i];
                    queue.add(async () => {
                        const buildConfig = getEntryBuildConfig(entrypoint, config);
                        const buildDir = buildConfig.root;
                        const result = await build({
                            ...buildConfig,
                            watch: buildConfig.watch && {
                                async onRebuild(error, result) {
                                    if (error) {
                                        logger.error(error);
                                    } else if (result) {
                                        if (cwd !== buildDir) {
                                            result = remapResult(result, buildDir, cwd);
                                        }
                                        buildResults[i] = result;
                                        await onBuildEnd(true);
                                        if (result.rebuild) {
                                            result.rebuild.dispose();
                                        }
                                    }
                                },
                            },
                        });
                        if (cwd !== buildDir) {
                            return remapResult(result, buildDir, cwd);
                        }
                        return result;
                    });
                }

                const buildResult = createResult();
                const buildResults = await queue.run(os.cpus().length);

                /**
                 * @param {boolean} [rebuild]
                 */
                const onBuildEnd = async (rebuild = false) => {
                    buildResults.forEach((result) => assignToResult(buildResult, result));
                    const metafile = buildResult.metafile;

                    if (typeof metafilePath === 'string') {
                        await writeMetafile(metafile, path.resolve(cwd, metafilePath));
                    }

                    if (Object.keys(metafile.outputs).length) {
                        const sizes = await bundleSize(metafile, showCompressed);
                        if (!rebuild) {
                            logger.log('Generated bundle files:\n');
                        }
                        logger.files(sizes, showCompressed ? ['size', 'gzip', 'brotli'] : ['size'], {
                            size: readableSize,
                            gzip: readableSize,
                            brotli: readableSize,
                        });
                    } else {
                        logger.log('Empty bundle.');
                    }
                };

                onBuildEnd();
            }
        );
}
