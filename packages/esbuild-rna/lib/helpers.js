import { Buffer } from 'buffer';
import crypto from 'crypto';
import path from 'path';

/**
 * Create an empty metafile object.
 * @returns {import('esbuild').Metafile}
 */
export function createEmptyMetafile() {
    return { inputs: {}, outputs: {} };
}

/**
 * Create an hash for the given buffer.
 * @param {Buffer|Uint8Array|string} buffer The buffer input.
 * @returns A buffer hash.
 */
export function createFileHash(buffer) {
    const hash = crypto.createHash('sha1');
    hash.update(Buffer.from(buffer));
    return hash.digest('hex').substring(0, 8);
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
        hash: createFileHash(contents),
        get text() {
            return contents.toString();
        },
    };
}

/**
 * @param {import('esbuild').OutputFile[]} [outputFiles]
 * @param {import('esbuild').Metafile} [metafile]
 * @returns {import('./Build.js').Result}
 */
export function createResult(outputFiles, metafile = createEmptyMetafile()) {
    return {
        errors: [],
        warnings: [],
        dependencies: {},
        outputFiles,
        metafile,
        mangleCache: {},
    };
}

/**
 * Merge esbuild results into a single object
 * that collects all inputs and outputs references, errors and warnings.
 * This is useful when running multiple builds in separated process.
 * @param {import('./Build.js').Result} context
 * @param {import('esbuild').BuildResult & { dependencies?: Record<string, string[]> }} result
 */
export function assignToResult(context, result) {
    context.errors.push(...result.errors);
    context.warnings.push(...result.warnings);

    if (context.outputFiles || result.outputFiles) {
        const outputFiles = (context.outputFiles = context.outputFiles || []);
        outputFiles.push(...(result.outputFiles || []));
    }

    const contextMeta = (context.metafile = context.metafile || createEmptyMetafile());
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
     * @type {Record<string, string[]>}
     */
    const dependencies = (context.dependencies = context.dependencies || {});
    if (typeof result.dependencies === 'object') {
        for (const out of Object.entries(result.dependencies)) {
            const entryPoint = out[0];
            const list = (dependencies[entryPoint] = dependencies[entryPoint] || []);
            out[1].forEach((dep) => {
                if (!list.includes(dep)) {
                    list.push(dep);
                }
            });
        }
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
            inputs: Object.keys(inputs).reduce((acc, input) => {
                const newPath = path.relative(to, path.resolve(from, input));
                acc[newPath] = inputs[input];
                return acc;
            }, /** @type {import('esbuild').Metafile['inputs']} */ ({})),
            outputs: Object.keys(outputs).reduce((acc, output) => {
                const newPath = path.relative(to, path.resolve(from, output));
                acc[newPath] = outputs[output];
                return acc;
            }, /** @type {import('esbuild').Metafile['outputs']} */ ({})),
        },
        mangleCache: result.mangleCache,
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
