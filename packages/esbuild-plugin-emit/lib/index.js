import path from 'path';
import { readFile } from 'fs/promises';
import { getMainOutput } from '@chialab/esbuild-helpers';
import { appendSearchParam, getSearchParam, getSearchParams, hasSearchParam } from '@chialab/node-resolve';

/**
 * @typedef {import('esbuild').Metafile} Metafile
 */

/**
 * @typedef {import('esbuild').BuildResult & { metafile: Metafile, outputFiles?: import('esbuild').OutputFile[] }} BuildResult
 */

/**
 * The filter regex for file imports.
 */
const EMIT_FILE_REGEX = /(\?|&)emit=file/;

/**
 * The namespace for emitted chunks.
 */
const EMIT_CHUNK_NS = 'emit-chunk';

/**
 * The filter regex for chunk imports.
 */
const EMIT_CHUNK_REGEX = /(\?|&)emit=chunk/;

/**
 * @typedef {Object} EmitTransformOptions
 * @property {boolean} [bundle]
 * @property {boolean} [splitting]
 * @property {import('esbuild').Platform} [platform]
 * @property {import('esbuild').Format} [format]
 * @property {import('esbuild').Plugin[]} [plugins]
 * @property {string[]} [inject]
 */

/**
 * Programmatically emit file reference.
 * @param {string} source The path of the file.
 */
export function emitFile(source) {
    return appendSearchParam(source, 'emit', 'file');
}

/**
 * Programmatically emit a chunk reference.
 * @param {string} source The path of the chunk.
 * @param {EmitTransformOptions} options Esbuild transform options.
 */
export function emitChunk(source, options = {}) {
    return appendSearchParam(appendSearchParam(source, 'emit', 'chunk'), 'transform', JSON.stringify(options));
}

/**
 * @param {import('esbuild').PluginBuild} build
 * @param {string} source
 */
export function emitFileOrChunk(build, source) {
    if (hasSearchParam(source, 'emit')) {
        return source;
    }

    const loaders = build.initialOptions.loader || {};
    const loader = loaders[path.extname(source)] || 'file';
    if (loader !== 'file' &&
        loader !== 'json') {
        return emitChunk(source);
    }
    return emitFile(source);
}

/**
 * Get the base uri reference.
 * @param {import('esbuild').PluginBuild} build
 */
export function getBaseUrl(build) {
    const options = build.initialOptions;

    if (options.platform === 'browser' && options.format !== 'esm') {
        return 'document.baseURI';
    }

    if (options.platform === 'node' && options.format !== 'esm') {
        return '\'file://\' + __filename';
    }

    return 'import.meta.url';
}

/**
 * @param {string} entryPoint
 * @param {string} [specifier]
 */
export function createImportStatement(entryPoint, specifier) {
    const identifier = `_${(specifier || entryPoint).split('?')[0].replace(/[^a-zA-Z0-9]/g, '_')}`;

    return {
        identifier,
        statement: `import ${identifier} from '${entryPoint}';`,
    };
}

/**
 * @param {import('@chialab/estransform').TransformData} data
 * @param {string} entryPoint
 * @param {string} [specifier]
 */
export function prependImportStatement({ magicCode, code }, entryPoint, specifier) {
    const { identifier, statement } = createImportStatement(entryPoint, specifier);
    if (code.startsWith('#!')) {
        magicCode.appendRight(code.indexOf('\n') + 1, `${statement}\n`);
    } else {
        magicCode.prepend(`${statement}\n`);
    }

    return { identifier, statement };
}

/**
 * Extract esbuild transform options for the chunk endpoint.
 * @param {string} entryPoint
 * @return {EmitTransformOptions}
 */
export function getChunkOptions(entryPoint) {
    const transform = getSearchParam(entryPoint, 'transform') || '{}';
    return JSON.parse(transform);
}

/**
 * @param {typeof import('esbuild')} [esbuild]
 * @return An esbuild plugin.
 */
export default function(esbuild) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'emitter',
        setup(build) {
            const options = build.initialOptions;
            const { sourceRoot, absWorkingDir, outdir, outfile, loader = {} } = options;
            const rootDir = sourceRoot || absWorkingDir || process.cwd();

            build.onResolve({ filter: EMIT_FILE_REGEX }, (args) => {
                const realPath = getSearchParams(args.path).path;
                const ext = path.extname(realPath);
                if (!loader[ext] || loader[ext] === 'file') {
                    return {
                        path: realPath,
                    };
                }
                return {
                    path: realPath,
                    pluginData: {
                        loader: 'file',
                    },
                };
            });

            build.onLoad({ filter: /./ }, async (args) => {
                if (args.pluginData?.loader !== 'file') {
                    return;
                }
                return {
                    contents: await readFile(args.path, 'utf-8'),
                    loader: 'file',
                };
            });

            build.onResolve({ filter: EMIT_CHUNK_REGEX }, (args) => ({
                path: getSearchParams(args.path).path,
                namespace: EMIT_CHUNK_NS,
                pluginData: getChunkOptions(args.path),
            }));

            build.onLoad({ filter: /./, namespace: EMIT_CHUNK_NS }, async ({ path: filePath, pluginData }) => {
                esbuild = esbuild || await import('esbuild');
                const outDir = outdir || path.dirname(/** @type {string} */(outfile));

                /** @type {import('esbuild').BuildOptions} */
                const config = {
                    ...options,
                    ...pluginData,
                    globalName: undefined,
                    entryPoints: [filePath],
                    outfile: undefined,
                    outdir: outDir,
                    metafile: true,
                };

                if (config.define) {
                    delete config.define['this'];
                }

                const result = /** @type { BuildResult} */ (await esbuild.build(config));
                filePath = getMainOutput([filePath], result.metafile, rootDir);

                return {
                    contents: await readFile(filePath),
                    loader: 'file',
                };
            });
        },
    };

    return plugin;
}
