import MagicString from 'magic-string';
import esbuild from 'esbuild';
import { parse } from './parser.js';
import { parseSourcemap, loadSourcemap, mergeSourcemaps, inlineSourcemap } from './sourcemaps.js';

/**
 * @typedef {Object} TransformOptions
 * @property {string} [source] The source filename.
 * @property {'inline'|boolean} [sourcemap] Should include sourcemap.
 * @property {boolean} [sourcesContent] Should include source content in sourcemaps.
 */

/**
 * @typedef {Object} TransformResult
 * @property {string} [code]
 * @property {SourceMap|null} [map]
 * @property {import('esbuild').Loader} [loader]
 * @property {string} [target]
 */

/**
 * @typedef {(data: { ast: acorn.Node, magicCode: MagicString, code: string }, options: TransformOptions) => Promise<TransformResult|void>|TransformResult|void} TransformCallack
 */

/**
 * @param {string} contents
 * @param {TransformOptions} options
 * @param {TransformCallack} callback
 * @return {Promise<TransformResult>}
 */
export async function transform(contents, options, callback) {
    /**
     * @type {MagicString|undefined}
     */
    let magicCode;
    /**
     * @type {acorn.Node|undefined}
     */
    let ast;
    return await callback({
        code: contents,
        get ast() {
            if (!ast) {
                ast = parse(contents);
            }
            return ast;
        },
        get magicCode() {
            if (!magicCode) {
                magicCode = new MagicString(contents);
            }
            return magicCode;
        },
    }, options) || {
        code: magicCode ? magicCode.toString() : undefined,
        map: options.sourcemap && magicCode ? parseSourcemap(
            magicCode.generateMap({
                hires: true,
                source: options.source,
                includeContent: options.sourcesContent,
            }).toString()
        ) : undefined,
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
    return async function transpileTypescript({ code }, options) {
        const { code: finalCode, map } = await esbuild.transform(code, {
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
            code: finalCode,
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

    if (code) {
        if (pipeline.sourceMaps && map && code !== pipeline.code) {
            pipeline.sourceMaps.push(map);
        }
        pipeline.code = code;
    }

    if (loader) {
        pipeline.loader = loader;
    }

    if (target) {
        pipeline.target = target;
    }
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
