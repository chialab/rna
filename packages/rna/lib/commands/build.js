import { createReadStream } from 'fs';
import os from 'os';
import path from 'path';
import process from 'process';
import { createBrotliCompress, createGzip } from 'zlib';
import { assignToResult, createResult, remapResult, useRna } from '@chialab/esbuild-rna';
import { build } from '@chialab/rna-bundler';
import { getEntryBuildConfig, locateConfigFile, mergeConfig, readConfigFile } from '@chialab/rna-config-loader';
import { colors, createLogger, readableSize } from '@chialab/rna-logger';
import { Queue } from '../utils/Queue.js';

/**
 * Get the compressed size of a file.
 *
 * @param {string} path File path
 * @param {import('zlib').BrotliCompress|import('zlib').Gzip} compressMethod Compression algorithm to use, one of `gzip` or `brotli`
 * @returns {Promise<number>} The file size in bytes
 */
function compressFileSize(path, compressMethod) {
    return new Promise((resolve, reject) => {
        /**
         * Handle compression and stream errors.
         *
         * @param {Error} err
         */
        const handleError = (err) => {
            process.stderr.write(`Error compressing file "${path}": ${err.message}\n`);
            compressMethod.destroy();
            stream.destroy();
            reject(err);
        };

        let size = 0;
        const stream = createReadStream(path);
        stream.on('error', handleError);
        compressMethod.on('error', handleError);
        compressMethod.on('data', (buf) => (size += buf.length));
        stream.pipe(compressMethod).on('end', () => {
            resolve(size);
            compressMethod.destroy();
            stream.destroy();
        });
    });
}

/**
 * Get output bundle size.
 *
 * @param {import('esbuild').Metafile} metafile The metafile for all bundle's generated files
 * @param {boolean} compressed Show size compressed with these algorithms. Supports gzip and brotli.
 */
async function bundleSize(metafile, compressed = false) {
    const fileSizes = Object.entries(metafile.outputs).reduce((map, [path, output]) => {
        if (!path.endsWith('.map')) {
            map[path] = { size: output.bytes };
        }

        return map;
    }, /** @type {{ [path: string]: { size: number, brotli?: number, gzip?: number } } }} */ ({}));

    if (compressed) {
        await Promise.all(
            Object.keys(fileSizes)
                .filter((path) => /\.(js|html|css|svg|json)$/.test(path))
                .map(async (path) => {
                    const [gzip, brotli] = await Promise.all([
                        compressFileSize(path, createGzip({ level: 6 })).catch(() => 0),
                        compressFileSize(path, createBrotliCompress()).catch(() => 0),
                    ]);

                    fileSizes[path].gzip = gzip;
                    fileSizes[path].brotli = brotli;
                })
        );
    }

    return fileSizes;
}

/**
 * @typedef {Object} BuildCommandOptions
 * @property {string} output
 * @property {string} [config]
 * @property {import('@chialab/rna-config-loader').Format} [format]
 * @property {string} [target]
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
 * @property {'transform'|'preserve'|'automatic'} [jsx]
 * @property {string} [jsxImportSource]
 * @property {string} [jsxFactory]
 * @property {string} [jsxFragment]
 * @property {string} [metafile]
 * @property {boolean} [showCompressed]
 * @property {boolean} [watch]
 */

/**
 * @param {import('commander').Command} program
 */
export default function (program) {
    program
        .command('build [entry...]', { isDefault: true })
        .description(
            'Compile JS and CSS modules using esbuild (https://esbuild.github.io/). It can output multiple module formats and it can be used to build a single module or to bundle all dependencies of an application.'
        )
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
        .option('--jsx <mode>', 'jsx transform mode')
        .option('--jsxImportSource <name>', 'jsx module name')
        .option('--jsxFactory <identifier>', 'jsx pragma')
        .option('--jsxFragment <identifier>', 'jsx fragment')
        .option('-W, --watch', 'live re-build on sources changes')
        .action(
            /**
             * @param {string[]} input
             * @param {BuildCommandOptions} options
             */
            async (input, options) => {
                const {
                    output,
                    format,
                    platform,
                    bundle,
                    minify,
                    name,
                    target,
                    public: publicPath,
                    entryNames,
                    chunkNames,
                    assetNames,
                    clean,
                    jsx,
                    jsxImportSource,
                    jsxFactory,
                    jsxFragment,
                    showCompressed,
                    watch,
                } = options;

                const logger = createLogger();
                const manifestPath = options.manifest
                    ? typeof options.manifest === 'string'
                        ? options.manifest
                        : path.join(output, 'manifest.json')
                    : undefined;
                const entrypointsPath = options.entrypoints
                    ? typeof options.entrypoints === 'string'
                        ? options.entrypoints
                        : path.join(output, 'entrypoints.json')
                    : undefined;
                const external = options.external ? options.external.split(',') : [];
                const sourcemap = options.map === true ? undefined : options.map;

                /**
                 * @type {import('@chialab/rna-config-loader').ProjectConfig}
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
                    jsx,
                    jsxFactory,
                    jsxFragment,
                    jsxImportSource,
                    watch,
                };

                const configFile = options.config || (await locateConfigFile());

                /**
                 * @type {import('@chialab/rna-config-loader').ProjectConfig}
                 */
                const config = mergeConfig(
                    { format: 'esm' },
                    configFile ? await readConfigFile(configFile, inputConfig, 'build') : {},
                    inputConfig,
                    input && input.length
                        ? {
                              entrypoints: [
                                  {
                                      input: input.map((entry) => path.resolve(entry)),
                                      output: path.resolve(output),
                                      globalName: name,
                                  },
                              ],
                              ...inputConfig,
                          }
                        : {}
                );

                const { entrypoints } = config;
                if (!entrypoints) {
                    throw new Error('Missing entrypoints.');
                }

                /**
                 * @type {import('esbuild').BuildResult[]}
                 */
                const buildResults = [];
                const buildResult = createResult();
                /**
                 * @param {boolean} [rebuild]
                 */
                const onBuildEnd = async (rebuild = false) => {
                    buildResults.forEach((result) => assignToResult(buildResult, result));
                    const metafile = buildResult.metafile;

                    if (Object.keys(metafile.outputs).length) {
                        const sizes = await bundleSize(metafile, showCompressed);
                        if (!rebuild) {
                            logger.log(
                                colors.bold(`
Build completed!
`)
                            );
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

                const queue = new Queue();
                const cwd = process.cwd();
                for (let i = 0; i < entrypoints.length; i++) {
                    const entrypoint = entrypoints[i];
                    queue.add(async () => {
                        /**
                         * @type {import('esbuild').Plugin}
                         */
                        const plugin = {
                            name: 'rna-logger',
                            setup(pluginBuild) {
                                const build = useRna(plugin, pluginBuild);

                                if (!build.isChunk()) {
                                    build.onEnd(async (result) => {
                                        if (cwd !== buildDir) {
                                            result = remapResult(
                                                /** @type {import('@chialab/esbuild-rna').Result} */ (result),
                                                buildDir,
                                                cwd
                                            );
                                        }
                                        if (buildResults[i]) {
                                            buildResults[i] = result;
                                            await onBuildEnd(true);
                                        } else {
                                            buildResults[i] = result;
                                        }
                                    });
                                }
                            },
                        };
                        const buildConfig = getEntryBuildConfig(entrypoint, {
                            ...config,
                            plugins: [...(config.plugins || []), plugin],
                        });
                        const buildDir = buildConfig.root || process.cwd();
                        const result = await build(buildConfig);
                        if (cwd !== buildDir) {
                            return remapResult(result, buildDir, cwd);
                        }
                        return result;
                    });
                }

                await queue.run(Math.max(1, os.cpus().length / 2));

                onBuildEnd();
            }
        );
}
