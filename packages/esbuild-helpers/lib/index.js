import path from 'path';
import crypto from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';

/**
 * Insert dependency plugins in the build plugins list.
 * @param {import('esbuild').PluginBuild} build The current build.
 * @param {import('esbuild').Plugin} plugin The current plugin.
 * @param {import('esbuild').Plugin[]} plugins A list of required plugins .
 * @param {'before'|'after'} [mode] Where insert the missing plugin.
 */
export async function setupPluginDependencies(build, plugin, plugins, mode = 'before') {
    const installedPlugins = build.initialOptions.plugins || [];
    const missingPlugins = [];

    let last = plugin;
    for (let i = 0; i < plugins.length; i++) {
        const dependency = plugins[i];
        if (installedPlugins.find((p) => p.name === dependency.name)) {
            continue;
        }

        missingPlugins.push(dependency.name);
        await dependency.setup(build);
        const io = installedPlugins.indexOf(last);
        if (mode === 'after') {
            last = dependency;
        }
        installedPlugins.splice(mode === 'before' ? io : (io + 1), 0, dependency);
    }

    build.initialOptions.plugins = installedPlugins;

    return missingPlugins;
}

/**
 * @typedef {import('esbuild').Metafile} Metafile
 */

/**
 * @typedef {import('esbuild').BuildResult & { metafile: Metafile, outputFiles?: import('esbuild').OutputFile[] }} BuildResult
 */

/**
 * Create an empty metafile object.
 * @return {Metafile}
 */
export function createEmptyMetafile() {
    return { inputs: {}, outputs: {} };
}

/**
 * @param {Metafile} [metafile]
 * @return {BuildResult}
 */
export function createResult(metafile = createEmptyMetafile()) {
    return {
        errors: [],
        warnings: [],
        metafile,
    };
}

/**
 * Merge esbuild results into a single object
 * that collects all inputs and outputs references, errors and warnings.
 * This is useful when running multiple builds in separated process.
 * @param {import('esbuild').BuildResult} context
 * @param {BuildResult} result
 */
export function assignToResult(context, result) {
    context.errors.push(...result.errors);
    context.warnings.push(...result.warnings);

    const contextMeta = context.metafile = context.metafile || createEmptyMetafile();
    const resultMeta = result.metafile || createEmptyMetafile();

    contextMeta.inputs = {
        ...contextMeta.inputs,
        ...resultMeta.inputs,
    };
    contextMeta.outputs = {
        ...contextMeta.outputs,
        ...resultMeta.outputs,
    };
}

/**
 * Get the entrypoint ouput from an esbuild result metafile.
 * This is useful when you need to build multiple files using the `outdir` option
 * and you don't know the name of the resulting file.
 * @param {string[]} entryPoints The list of build entrypoints.
 * @param {Metafile} metafile The result metafile from esbuild.
 * @param {string} rootDir The root dir of the build.
 * @return {string}
 */
export function getMainOutput(entryPoints, metafile, rootDir = process.cwd()) {
    const outputs = metafile.outputs;
    const outFile = Object.keys(outputs)
        .filter((output) => !output.endsWith('.map'))
        .filter((output) => outputs[output].entryPoint)
        .find((output) => entryPoints.includes(
            path.resolve(
                rootDir,
                /** @type {string} */(outputs[output].entryPoint?.replace(/^\w+:/, ''))
            )
        ));

    return path.resolve(rootDir, /** @type {string} */ (outFile));
}

/**
 * @param {string} from
 * @param {import('esbuild').BuildOptions} options
 */
export async function esbuildFile(from, options = {}) {
    const { assetNames = '[name]' } = options;
    const rootDir = getRootDirByOptions(options);
    const outDir = getOutputDirByOptions(options);

    const inputFile = path.relative(rootDir, from);
    const ext = path.extname(inputFile);
    const basename = path.basename(inputFile, ext);
    const buffer = await readFile(inputFile);
    const computedName = assetNames
        .replace('[name]', basename)
        .replace('[hash]', () => {
            const hash = crypto.createHash('sha1');
            hash.update(buffer);
            return hash.digest('hex').substr(0, 8);
        });

    const outputFile = path.join(outDir, `${computedName}${ext}`);
    await mkdir(path.dirname(outputFile), {
        recursive: true,
    });
    await writeFile(outputFile, buffer);

    const relativeOutputFile = path.relative(rootDir, outputFile);
    const bytes = Buffer.byteLength(buffer);

    return {
        outputFile: relativeOutputFile,
        result: createResult(
            {
                inputs: {
                    [inputFile]: {
                        bytes,
                        imports: [],
                    },
                },
                outputs: {
                    [relativeOutputFile]: {
                        bytes,
                        inputs: {
                            [inputFile]: {
                                bytesInOutput: bytes,
                            },
                        },
                        imports: [],
                        exports: [],
                        entryPoint: inputFile,
                    },
                },
            }
        ),
    };
}

/**
 * @param {import('esbuild').BuildResult} result
 * @param {string} from
 * @param {string} to
 * @return {BuildResult}
 */
export function remapResult(result, from, to) {
    const resultMeta = result.metafile || createEmptyMetafile();
    const inputs = resultMeta.inputs;
    const outputs = resultMeta.outputs;

    return {
        errors: result.errors,
        warnings: result.warnings,
        metafile: {
            inputs: Object.keys(inputs)
                .reduce((acc, input) => {
                    const newPath = path.relative(to, path.resolve(from, input));
                    acc[newPath] = inputs[input];
                    return acc;
                }, /** @type {Metafile['inputs']} */({})),
            outputs: Object.keys(outputs)
                .reduce((acc, output) => {
                    const newPath = path.relative(to, path.resolve(from, output));
                    acc[newPath] = outputs[output];
                    return acc;
                }, /** @type {Metafile['outputs']} */ ({})),
        },
    };
}

/**
 * @param {import('esbuild').BuildOptions} options
 */
export function getRootDirByOptions(options) {
    const { sourceRoot, absWorkingDir } = options;
    return sourceRoot || absWorkingDir || process.cwd();
}

/**
 * @param {import('esbuild').PluginBuild} build
 */
export function getRootDir(build) {
    return getRootDirByOptions(build.initialOptions);
}

/**
 * @param {import('esbuild').BuildOptions} options
 */
export function getStdinInputByOptions(options) {
    const { stdin } = options;
    if (!stdin) {
        return null;
    }
    const rootDir = getRootDirByOptions(options);
    const input = stdin.sourcefile;
    return {
        path: input && path.resolve(rootDir, input),
        contents: stdin.contents.toString(),
    };
}

/**
 * @param {import('esbuild').PluginBuild} build
 */
export function getStdinInput(build) {
    return getStdinInputByOptions(build.initialOptions);
}

/**
 * @param {import('esbuild').BuildOptions} options
 */
export function getOutputDirByOptions(options) {
    const { outdir, outfile } = options;
    return /** @type {string} */(outdir || (outfile && path.dirname(outfile)));
}

/**
 * @param {import('esbuild').PluginBuild} build
 */
export function getOutputDir(build) {
    return getOutputDirByOptions(build.initialOptions);
}

/**
 * @typedef {{ [key: string]: string[] }} DependenciesMap
 */

/**
 * @type {WeakMap<import('esbuild').BuildOptions, DependenciesMap>}
 */
const BUILD_DEPENDENCIES = new WeakMap();

/**
 * Store a build dependency.
 * @param {import('esbuild').PluginBuild} build
 * @param {string} importer
 * @param {string[]} dependencies
 */
export function addBuildDependencies(build, importer, dependencies) {
    const map = getBuildDependencies(build);
    map[importer] = [
        ...(map[importer] || []),
        ...dependencies,
    ];

    BUILD_DEPENDENCIES.set(build.initialOptions, map);
}

/**
 * Cleanup build dependencies map.
 * @param {import('esbuild').PluginBuild} build
 */
export function getBuildDependencies(build) {
    return BUILD_DEPENDENCIES.get(build.initialOptions) || {};
}

/**
 * @param {import('esbuild').PluginBuild} build
 * @param {import('esbuild').BuildResult} result
 * @param {string} rootDir
 * @return {DependenciesMap}
 */
export function mergeDependencies(build, result, rootDir) {
    const dependencies = getBuildDependencies(build) || {};
    const { metafile } = result;
    if (!metafile) {
        return dependencies;
    }
    for (const out of Object.values(metafile.outputs)) {
        if (!out.entryPoint) {
            continue;
        }

        const entryPoint = path.resolve(rootDir, out.entryPoint);
        const list = dependencies[entryPoint] = dependencies[entryPoint] || [];
        list.push(...Object.keys(out.inputs).map((file) => path.resolve(rootDir, file)));
    }

    return dependencies;
}
