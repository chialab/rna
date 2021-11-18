import path from 'path';

/**
 * @typedef {import('esbuild').Metafile} Metafile
 */

/**
 * @typedef {import('esbuild').BuildResult & { metafile: Metafile, outputFiles: import('esbuild').OutputFile[] }} BuildResult
 */

/**
 * Create an empty metafile object.
 * @return {Metafile}
 */
export function createEmptyMetafile() {
    return { inputs: {}, outputs: {} };
}

/**
 * @param {string} path
 * @param {Buffer} contents
 * @return {import('esbuild').OutputFile}
 */
export function createOutputFile(path, contents) {
    return {
        path,
        contents,
        get text() {
            return contents.toString();
        },
    };
}

/**
 * @param {import('esbuild').OutputFile[]} [outputFiles]
 * @param {Metafile} [metafile]
 * @return {BuildResult}
 */
export function createResult(outputFiles = [], metafile = createEmptyMetafile()) {
    return {
        errors: [],
        warnings: [],
        outputFiles,
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
    const outputFiles = context.outputFiles = context.outputFiles || [];
    outputFiles.push(...(result.outputFiles || []));

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
        outputFiles: result.outputFiles || [],
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
 * Check if a plugin is already part of the list.
 * @param {import('esbuild').Plugin[]} plugins The plugins list.
 * @param {string} name The of the plugin to check.
 */
export function hasPlugin(plugins, name) {
    return plugins.some((plg) => plg.name === name);
}
