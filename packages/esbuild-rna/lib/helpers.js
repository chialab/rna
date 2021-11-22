import path from 'path';

/**
 * @typedef {import('esbuild').Metafile} Metafile
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
 * @return {import('./index.js').Result}
 */
export function createResult(outputFiles, metafile = createEmptyMetafile()) {
    return {
        errors: [],
        warnings: [],
        dependencies: {},
        outputFiles,
        metafile,
    };
}

/**
 * Merge esbuild results into a single object
 * that collects all inputs and outputs references, errors and warnings.
 * This is useful when running multiple builds in separated process.
 * @param {import('./index.js').Result} context
 * @param {import('./index.js').Result} result
 */
export function assignToResult(context, result) {
    context.errors.push(...result.errors);
    context.warnings.push(...result.warnings);

    if (context.outputFiles || result.outputFiles) {
        const outputFiles = context.outputFiles = context.outputFiles || [];
        outputFiles.push(...(result.outputFiles || []));
    }

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

    /**
     * @type {import('./index.js').DependenciesMap}
     */
    const dependencies = context.dependencies = context.dependencies || {};
    for (const out of Object.values(resultMeta.outputs)) {
        if (!out.entryPoint) {
            continue;
        }

        const entryPoint = out.entryPoint;
        const list = dependencies[entryPoint] = dependencies[entryPoint] || [];
        list.push(...Object.keys(out.inputs).map((file) => file));
    }
}

/**
 * @param {import('./index.js').Result} result
 * @param {string} from
 * @param {string} to
 * @return {import('./index.js').Result}
 */
export function remapResult(result, from, to) {
    const resultMeta = result.metafile || createEmptyMetafile();
    const inputs = resultMeta.inputs;
    const outputs = resultMeta.outputs;

    return {
        errors: result.errors,
        warnings: result.warnings,
        outputFiles: result.outputFiles,
        dependencies: result.dependencies,
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
