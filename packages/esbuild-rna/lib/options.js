import path from 'path';

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
