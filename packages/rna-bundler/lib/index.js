import os from 'os';
import path from 'path';
import { getEntryBuildConfig, mergeConfig, readConfigFile, locateConfigFile } from '@chialab/rna-config-loader';
import { build } from './build.js';
import { saveManifestJson } from './saveManifestJson.js';
import { saveEntrypointsJson, saveDevEntrypointsJson } from './saveEntrypointsJson.js';
import { loadPlugins, loadTransformPlugins } from './loadPlugins.js';
import { Queue } from './Queue.js';

export * from './loaders.js';
export * from './transform.js';
export * from './build.js';
export { loadPlugins, loadTransformPlugins, saveManifestJson, saveEntrypointsJson, saveDevEntrypointsJson };

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
        .option('--entryNames <pattern>', 'output file names')
        .option('--chunkNames <pattern>', 'output chunk names')
        .option('--assetNames <pattern>', 'output asset names')
        .option('--clean', 'cleanup output path')
        .option('--manifest <path>', 'generate manifest file')
        .option('--entrypoints <path>', 'generate entrypoints file')
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
             * @param {{ config?: string, output: string, format?: import('@chialab/rna-config-loader').Format, target?: import('@chialab/rna-config-loader').Target, platform: import('@chialab/rna-config-loader').Platform, bundle?: boolean, minify?: boolean, name?: string, manifest?: boolean|string, entrypoints?: boolean|string, public?: string, entryNames?: string, chunkNames?: string, assetNames?: string, clean?: boolean, external?: string, map?: boolean, jsxFactory?: string, jsxFragment?: string, jsxModule?: string, jsxExport?: 'named'|'namespace'|'default' }} options
             */
            async (input, { config: configFile, output, format = 'esm', platform, bundle, minify, name, manifest, entrypoints, target, public: publicPath, entryNames, chunkNames, assetNames, clean, external: externalString, map: sourcemap, jsxFactory, jsxFragment, jsxModule, jsxExport }) => {
                const { default: esbuild } = await import('esbuild');
                const manifestPath = manifest ? (typeof manifest === 'string' ? manifest : path.join(output, 'manifest.json')) : undefined;
                const entrypointsPath = entrypoints ? (typeof entrypoints === 'string' ? entrypoints : path.join(output, 'entrypoints.json')) : undefined;
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
                    plugins: await loadPlugins({
                        html: {},
                        postcss: { relative: false },
                    }, esbuild),
                    transformPlugins: await loadTransformPlugins({
                        commonjs: {},
                        babel: target === 'es5' ? {} : undefined,
                    }),
                };

                configFile = configFile || await locateConfigFile();

                /**
                 * @type {import('@chialab/rna-config-loader').Config}
                 */
                const config = mergeConfig(configFile ? await readConfigFile(configFile, inputConfig, 'build') : {}, inputConfig, input && input.length ? {
                    entrypoints: [{
                        input: input.map((entry) => path.resolve(entry)),
                        output: path.resolve(output),
                        globalName: name,
                    }],
                    ...inputConfig,
                } : {});

                if (!config.entrypoints) {
                    throw new Error('Missing entrypoints.');
                }

                const queue = new Queue();
                for (const entrypoint of config.entrypoints) {
                    queue.add(() => build(getEntryBuildConfig(entrypoint, config)));
                }

                await queue.run(os.cpus().length);
            }
        );
}
