import path from 'path';
import fs from 'fs';
import { build } from './build.js';
import { saveManifestJson } from './saveManifestJson.js';
import { saveEntrypointsJson, saveDevEntrypointsJson } from './saveEntrypointsJson.js';
import { loadPlugins, loadTransformPlugins } from './loadPlugins.js';

export * from './loaders.js';
export * from './transform.js';
export * from './build.js';
export { loadPlugins, loadTransformPlugins, saveManifestJson, saveEntrypointsJson, saveDevEntrypointsJson };

/**
 * Writes a JSON file with the metafile contents, for bundle analysis.
 *
 * @param {import('esbuild').Metafile[]} bundleFiles Array of metafiles for all bundle's generated files
 * @param {string} filePath Path of the JSON file to generate
 * @return {void}
 */
const writeMetafile = (bundleFiles, filePath) => {
    const bundle = bundleFiles.reduce((bundle, /** @type {import('esbuild').Metafile} */ metaFile) => {
        bundle.inputs = { ...bundle.inputs, ...metaFile.inputs };
        bundle.outputs = { ...bundle.outputs, ...metaFile.outputs };

        return bundle;
    }, { inputs: {}, outputs: {} });

    fs.writeFileSync(filePath, JSON.stringify(bundle));
};

/**
 * Print bundle size information to console.
 *
 * @param {import('esbuild').Metafile[]} bundleFiles Array of metafiles for all bundle's generated files
 * @return {void}
 */
const printBundleSize = (bundleFiles) => {
    const totalSize = bundleFiles.reduce((total, /** @type {import('esbuild').Metafile} */ metaFile) => total + Object.values(metaFile.outputs).reduce((total, output) => total + output.bytes, 0), 0);
    const longestFilename = bundleFiles.reduce((longest, /** @type {import('esbuild').Metafile} */ metaFile) => {
        const metaFileLongest = Object.keys(metaFile.outputs).reduce((longest, path) => {
            if (longest > path.length) {
                return longest;
            }

            return path.length;
        }, 0);

        if (longest > metaFileLongest) {
            return longest;
        }

        return metaFileLongest;
    }, 0);
    process.stdout.write('Generated bundle files:\n');
    bundleFiles.forEach((/** @type {import('esbuild').Metafile} */ metaFile) => {
        Object.entries(metaFile.outputs).forEach(([path, output]) => {
            process.stdout.write(`\t${path.padEnd(longestFilename, ' ')}\t(${toReadableSize(output.bytes)})\n`);
        });
    });
    process.stdout.write(`Total bundle size: ${toReadableSize(totalSize)}\n`);
};

/**
 * Convert a number of bytes to human-readable text.
 *
 * @param {number} byteSize
 * @return {string}
 */
const toReadableSize = (byteSize) => {
    if (byteSize === undefined || byteSize < 0) {
        return 'invalid size';
    }
    if (byteSize === 0) {
        return '0 B';
    }

    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
    const log2 = Math.log2(byteSize);
    const unitIdx = Math.floor(log2 / 10);
    const normalizedSize = byteSize / (1 << (unitIdx * 10));

    return `${normalizedSize.toFixed(2)} ${units[unitIdx]}`;
};


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
        .option('--chunkNames <pattern>', 'output chunk names')
        .option('--assetNames <pattern>', 'output asset names')
        .option('--clean', 'cleanup output path')
        .option('--manifest [path]', 'generate manifest file')
        .option('--entrypoints [path]', 'generate entrypoints file')
        .option('--name <identifier>', 'the iife global name')
        .option('--external [modules]', 'comma separated external packages')
        .option('--no-map', 'do not generate sourcemaps')
        .option('--metafile <path>', 'write JSON metadata file about the build')
        .option('--jsxFactory <identifier>', 'jsx pragma')
        .option('--jsxFragment <identifier>', 'jsx fragment')
        .option('--jsxModule <name>', 'jsx module name')
        .option('--jsxExport <type>', 'jsx export mode')
        .action(
            /**
             * @param {string[]} input
             * @param {{ output: string, format?: import('esbuild').Format, platform: import('esbuild').Platform, bundle?: boolean, minify?: boolean, name?: string, watch?: boolean, manifest?: boolean|string, entrypoints?: boolean|string, target?: string, public?: string, entryNames?: string, chunkNames?: string, assetNames?: string, clean?: boolean, external?: string, map?: boolean, metafile?: string, jsxFactory?: string, jsxFragment?: string, jsxModule?: string, jsxExport?: 'named'|'namespace'|'default' }} options
             */
            async (input, { output, format = 'esm', platform, bundle, minify, name, watch, manifest, entrypoints, target, public: publicPath, entryNames, chunkNames, assetNames, clean, external, map, metafile, jsxFactory, jsxFragment, jsxModule, jsxExport }) => {
                const { default: esbuild } = await import('esbuild');
                /** @type {import('esbuild').Metafile[]} */
                const bundleMetafiles = [];

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
                    chunkNames,
                    assetNames,
                    sourcemap: map,
                    sourcesContent: true,
                    jsxFactory,
                    jsxFragment,
                    jsxModule,
                    jsxExport,
                    plugins: await loadPlugins({
                        html: {
                            addBundleMetafile: (/** @type {import('esbuild').Metafile} */ meta) => bundleMetafiles.push(meta),
                        },
                        postcss: { relative: false },
                    }, esbuild),
                    transformPlugins: await loadTransformPlugins({
                        commonjs: {},
                        babel: target === 'es5' ? {} : undefined,
                    }),
                });

                printBundleSize(bundleMetafiles);
                if (typeof metafile === 'string') {
                    writeMetafile(bundleMetafiles, path.relative(process.cwd(), metafile));
                }
            }
        );
}
