import { promises } from 'fs';
import path from 'path';
import MagicString from 'magic-string';
import esbuild from 'esbuild';

const { readFile } = promises;
const SOURCEMAP_REGEX = /(?:(\/\*+[\s\S]*?sourceMappingURL\s*=)([\s\S]*?)(\*\/))|(?:(\/\/.*?sourceMappingURL\s*=)(.*?)([\r\n]))/;

/**
 * @typedef {Object} SourceMap
 * @property {number} [version]
 * @property {string[]} sources
 * @property {string[]} names
 * @property {string} [sourceRoot]
 * @property {string[]} [sourcesContent]
 * @property {string} mappings
 * @property {string} [file]
 */

/**
 * @param {string} map
 * @return {SourceMap}
 */
export function parseSourcemap(map) {
    return JSON.parse(map);
}

/**
 * @param {string} code
 * @param {string} [filePath]
 */
export async function loadSourcemap(code, filePath) {
    const match = code.match(SOURCEMAP_REGEX);
    if (match) {
        const mapUrl = match[2] || match[5];
        try {
            let content;
            if (mapUrl.startsWith('data:')) {
                content = Buffer.from(mapUrl.split(',')[1]).toString('base64');
                return parseSourcemap(content);
            }

            if (filePath) {
                content = await readFile(path.resolve(path.dirname(filePath), mapUrl), 'utf-8');
                return parseSourcemap(content);
            }
        } catch {
            //
        }
    }

    return null;
}

/**
 * @param {SourceMap[]} sourceMaps
 */
export async function mergeSourcemaps(sourceMaps) {
    if (sourceMaps.length === 1) {
        return {
            version: 3,
            ...sourceMaps[0],
        };
    }

    const { default: { default: SourceMapNode } } = await import('@parcel/source-map');

    const sourceMap = sourceMaps.reduce(
        /**
         * @param {InstanceType<SourceMapNode>|null} sourceMap
         * @param {SourceMap} map
         * @return {InstanceType<SourceMapNode>}
         */
        (sourceMap, map) => {
            const mergedMap = new SourceMapNode();
            mergedMap.addVLQMap(map);
            if (sourceMap) {
                mergedMap.extends(sourceMap.toBuffer());
            }

            return mergedMap;
        },
        null
    );

    if (!sourceMap) {
        return null;
    }

    return {
        version: 3,
        ...sourceMap.toVLQ(),
    };
}

/**
 * @typedef {Object} TransformOptions
 * @property {string} [source] The source filename.
 * @property {'inline'|boolean} [sourcemap] Should include sourcemap.
 * @property {boolean} [sourcesContent] Should include source content in sourcemaps.
 */

/**
 * @typedef {Object} TransformResult
 * @property {string} code
 * @property {SourceMap|null} map
 * @property {import('esbuild').Loader} [loader]
 * @property {string} [target]
 */

/**
 * @typedef {(magicCode: MagicString, code: string, options: TransformOptions) => Promise<TransformResult|void>|TransformResult|void} TransformCallack
 */

/**
 * @param {string} contents
 * @param {TransformOptions} options
 * @param {TransformCallack} callback
 * @return {Promise<TransformResult>}
 */
export async function transform(contents, options, callback) {
    const magicCode = new MagicString(contents);
    return await callback(magicCode, contents, options) || {
        code: magicCode.toString(),
        map: options.sourcemap ? parseSourcemap(
            magicCode.generateMap({
                hires: true,
                source: options.source,
                includeContent: options.sourcesContent,
            }).toString()
        ) : null,
    };
}

export const TARGETS = {
    unknown: 'unknown',
    typescript: 'typescript',
    es2020: 'es2020',
    es2019: 'es2019',
    es2018: 'es2018',
    es2017: 'es2017',
    es2016: 'es2016',
    es2015: 'es2015',
    es5: 'es5',
};

/**
 * Transpile entry to standard js.
 * @param {import('esbuild').TransformOptions} [config]
 * @return {TransformCallack}
 */
export function createTypeScriptTransform(config = {}) {
    return async function transpileTypescript(magicCode, contents, options) {
        const { code, map } = await esbuild.transform(contents, {
            tsconfigRaw: {},
            sourcemap: true,
            format: 'esm',
            target: TARGETS.es2020,
            sourcefile: options.source,
            loader: config.loader,
            jsxFactory: config.jsxFactory,
            jsxFragment: config.jsxFragment,
        });

        return {
            code,
            map: parseSourcemap(map),
            target: TARGETS.es2020,
            loader: 'js',
        };
    };
}

/**
 * @typedef {Object} Pipeline
 * @property {string} contents
 * @property {string} code
 * @property {SourceMap[]|null} sourceMaps
 * @property {string} target
 * @property {import('esbuild').Loader} loader
 */

/**
 * @param {string} contents
 * @param {{ sourcemap?: boolean, source?: string }} [options]
 */
export async function createPipeline(contents, { sourcemap = true, source } = {}) {
    const sourceMaps = [];

    if (sourcemap) {
        const map = await loadSourcemap(contents, source);
        if (map) {
            sourceMaps.push(map);
        }
    }

    const target = source && source.match(/\.tsx?$/) ? TARGETS.typescript : TARGETS.unknown;
    const loader = source && source.match(/\.ts$/) ? 'ts' : 'tsx';

    /**
     * @type {Pipeline}
     */
    const pipeline = {
        contents,
        code: contents,
        sourceMaps: sourcemap ? sourceMaps : null,
        target,
        loader,
    };

    return pipeline;
}

/**
 * @param {Pipeline} pipeline
 * @param {TransformOptions} options
 * @param {TransformCallack} callback
 */
export async function pipe(pipeline, options, callback) {
    const { code, map, loader, target } = await transform(pipeline.code, {
        sourcemap: !!pipeline.sourceMaps,
        ...options,
    }, callback);

    pipeline.code = code;
    if (pipeline.sourceMaps && map && code !== pipeline.code) {
        pipeline.sourceMaps.push(map);
    }

    if (loader) {
        pipeline.loader = loader;
    }

    if (target) {
        pipeline.target = target;
    }
}

/**
 * @param {string} code
 * @param {SourceMap} sourceMap
 */
export function inlineSourcemap(code, sourceMap) {
    const match = code.match(SOURCEMAP_REGEX);
    const url = `data:application/json;base64,${Buffer.from(JSON.stringify(sourceMap)).toString('base64')}`;
    if (!match) {
        return `${code}\n//# sourceMappingURL=${url}\n`;
    }

    return code.replace(SOURCEMAP_REGEX, (full, arg1, arg2, arg3, arg4, arg5, arg6) => `${arg1 || arg4}${url}${arg3 || arg6}`);
}

/**
 * @param {Pipeline} pipeline
 * @param {TransformOptions} options
 * @return {Promise<TransformResult>}
 */
export async function finalize(pipeline, { source, sourcemap = true, sourcesContent = true }) {
    if (!pipeline.sourceMaps || !pipeline.sourceMaps.length || pipeline.code === pipeline.contents || !sourcemap) {
        return {
            code: pipeline.code,
            map: null,
            loader: pipeline.loader,
        };
    }

    const finalMap = await mergeSourcemaps(pipeline.sourceMaps);
    if (!finalMap) {
        return {
            code: pipeline.code,
            map: null,
            loader: pipeline.loader,
        };
    }

    if (source) {
        finalMap.file = source;
    } else {
        delete finalMap.file;
    }

    if (!sourcesContent) {
        delete finalMap.sourcesContent;
    }

    return {
        code: sourcemap === 'inline' ? inlineSourcemap(pipeline.code, finalMap) : pipeline.code,
        map: finalMap,
        loader: pipeline.loader,
    };
}
