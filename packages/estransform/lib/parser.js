import { Buffer } from 'buffer';
import { MagicString } from '@napi-rs/magic-string';
import { parseAsync } from 'oxc-parser';
import { inlineSourcemap, loadSourcemap, mergeSourcemaps, removeInlineSourcemap } from './sourcemaps.js';

/**
 * @typedef {{ type: string; start: number; end: number; [key: string]: any }} Node
 */

/**
 * @param {*} obj
 * @param {(string|number)[]} path
 * @returns {Generator<Node>}
 */
function* jsonWalker(obj, path = []) {
    if (typeof obj === 'object' && obj != null) {
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                yield* jsonWalker(obj[i], [...path, i]);
            }
        } else {
            if (Object.hasOwn(obj, 'type')) {
                yield obj;
            }
            for (const key in obj) {
                if (Object.hasOwn(obj, key)) {
                    yield* jsonWalker(obj[key], [...path, key]);
                }
            }
        }
    }
}

/**
 * Walk an ast node.
 * @param {Node} root
 * @param {Record<string, (node: Node) => void | Promise<void>>} visitors
 * @returns {Promise<void>}
 */
export async function walk(root, visitors) {
    for (const object of jsonWalker(root)) {
        if (visitors[object.type]) {
            const result = visitors[object.type](object);
            if (result instanceof Promise) {
                await result;
            }
        }
    }
}

/**
 * @param {string} inputCode The code to parse.
 * @param {string} [filePath] The source file name.
 */
export async function parse(inputCode, filePath) {
    const code = removeInlineSourcemap(inputCode);
    const buffer = Buffer.from(code);
    const magicCode = new MagicString(code);
    const result = await parseAsync(code, { sourceType: 'module', sourceFilename: filePath });
    const ast = JSON.parse(result.program);

    let changed = false;

    return {
        ast,
        comments: result.comments,
        helpers: {
            /**
             * @param {number} start
             * @param {number} end
             * @returns {string}
             */
            substring(start, end) {
                return buffer.subarray(start, end).toString('utf8');
            },
            /**
             * @param {string} code
             * @param {number} [index]
             */
            prepend(code, index) {
                changed = true;
                if (index != null) {
                    magicCode.prependLeft(index, code);
                } else {
                    magicCode.prepend(code);
                }
            },
            /**
             * @param {string} code
             * @param {number} [index]
             */
            append(code, index) {
                changed = true;
                if (index != null) {
                    magicCode.appendRight(index, code);
                } else {
                    magicCode.append(code);
                }
            },
            /**
             * @param {number} start
             * @param {number} end
             * @param {string} code
             */
            overwrite(start, end, code) {
                changed = true;
                magicCode.overwrite(start, end, code);
            },
            isDirty() {
                return changed;
            },
            /**
             * @param {{ sourcemap?: boolean|'inline'; sourcesContent?: boolean }} options
             */
            async generate(options = {}) {
                const code = magicCode.toString();

                let map = null;
                if (options.sourcemap) {
                    const inputSourcemap = await loadSourcemap(inputCode, filePath);
                    const newSourcemap = /** @type {import('./sourcemaps.js').SourceMap} */ (
                        magicCode
                            .generateMap({
                                source: filePath,
                                includeContent: options.sourcesContent || false,
                                hires: true,
                            })
                            .toMap()
                    );

                    map = inputSourcemap ? await mergeSourcemaps([inputSourcemap, newSourcemap]) : newSourcemap;
                }

                if (options.sourcemap === 'inline' && map) {
                    return {
                        code: inlineSourcemap(code, map),
                        map,
                    };
                }

                return { code, map };
            },
        },
    };
}
