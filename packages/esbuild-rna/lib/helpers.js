import path from 'path';
import crypto from 'crypto';

/**
 * @typedef {import('esbuild').Metafile} Metafile
 */

/**
 * Get the base out path.
 * @param {string[] | Record<string, string>} entryPoints The entry points.
 * @param {string} basePath The current working directory.
 * @returns {string}
 */
export function getOutBase(entryPoints, basePath) {
    if (!entryPoints.length) {
        return basePath;
    }

    const separator = /\/+|\\+/;

    return (Array.isArray(entryPoints) ? entryPoints : Object.values(entryPoints))
        .map((entry) => (path.isAbsolute(entry) ? entry : path.resolve(basePath, entry)))
        .map((entry) => path.dirname(entry))
        .map((entry) => entry.split(separator))
        .reduce((result, chunk) => {
            const len = Math.min(chunk.length, result.length);
            for (let i = 0; i < len; i++) {
                if (chunk[i] !== result[i]) {
                    return result.splice(0, i);
                }
            }
            return result.splice(0, len);
        })
        .join(path.sep) || path.sep;
}

/**
 * Create hash for the given buffer.
 * @param {Buffer} buffer The buffer.
 * @returns An hash.
 */
export function createHash(buffer) {
    const hash = crypto.createHash('sha1');
    hash.update(/** @type {Buffer} */(buffer));
    return hash.digest('hex').substring(0, 8);
}

/**
 * Create an empty metafile object.
 * @returns {Metafile}
 */
export function createEmptyMetafile() {
    return { inputs: {}, outputs: {} };
}

/**
 * @param {string} path
 * @param {Buffer} contents
 * @returns {import('esbuild').OutputFile}
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
 * @returns {import('./Build.js').Result}
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
 * @param {import('./Build.js').Result} context
 * @param {import('./Build.js').Result} result
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
     * @type {import('./Build.js').DependenciesMap}
     */
    const dependencies = context.dependencies = context.dependencies || {};
    for (const out of Object.entries(result.dependencies)) {
        const entryPoint = out[0];
        const list = dependencies[entryPoint] = dependencies[entryPoint] || [];
        out[1].forEach((dep) => {
            if (!list.includes(dep)) {
                list.push(dep);
            }
        });
    }
}

/**
 * @param {import('./Build.js').Result} result
 * @param {string} from
 * @param {string} to
 * @returns {import('./Build.js').Result}
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
