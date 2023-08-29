import { readFile } from 'fs/promises';
import path from 'path';
import { Buffer } from 'buffer';
import sourceMapDefault from '@parcel/source-map';

const { default: SourceMapNode } = sourceMapDefault;

const SOURCEMAP_REGEX = /(?:(\/\*+\s*?sourceMappingURL\s*=)([\s\S]*?)(\*\/))|(?:(\/\/#?\s*?sourceMappingURL\s*=)(.*?)([\r\n]|$))/;

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
 * @returns {SourceMap}
 */
export function parseSourcemap(map) {
    return JSON.parse(map);
}

/**
 * @param {string} code
 */
export function removeInlineSourcemap(code) {
    return code.split(SOURCEMAP_REGEX)[0];
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
                const [mapHeader, mapContent] = mapUrl.split(',');
                if (mapHeader.includes(';base64')) {
                    return parseSourcemap(Buffer.from(mapContent, 'base64').toString('ascii'));
                }
                return parseSourcemap(mapContent);
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

    const sourceMap = sourceMaps.reduce(
        /**
         * @param {InstanceType<SourceMapNode>|null} sourceMap
         * @param {SourceMap} map
         * @returns {InstanceType<SourceMapNode>}
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
