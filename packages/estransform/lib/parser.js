import MagicString from 'magic-string';
import { parse as sucraseParse } from 'sucrase/dist/parser/index.js';
import NameManagerModule from 'sucrase/dist/NameManager.js';
import { HelperManager } from 'sucrase/dist/HelperManager.js';
import TokenProcessorModule from 'sucrase/dist/TokenProcessor.js';
import { inlineSourcemap, loadSourcemap, mergeSourcemaps, removeInlineSourcemap } from './sourcemaps.js';

/**
 * @param {*} mod
 */
function interopImport(mod) {
    return (typeof mod.default !== 'undefined' ? mod.default : mod);
}

export const NameManager = /** @type {typeof import('sucrase/dist/NameManager.js').default} */ (interopImport(NameManagerModule));
export const TokenProcessor = /** @type {typeof import('sucrase/dist/TokenProcessor.js').default} */ (interopImport(TokenProcessorModule));

/**
 * Walk through tokens and wait async visitors.
 *
 * @param {InstanceType<TokenProcessor>} processor
 * @param {(token: import('./types.js').Token, index: number, processor: InstanceType<TokenProcessor>) => void|false|Promise<void|false>} callback
 */
export async function walk(processor, callback) {
    if (processor.isAtEnd()) {
        processor.reset();
    }

    while (!processor.isAtEnd()) {
        const token = processor.currentToken();
        const index = processor.currentIndex();

        let result = callback(token, index, processor);
        if (result instanceof Promise) {
            result = await result;
        }

        if (result === false) {
            return;
        }

        if (processor.isAtEnd()) {
            return;
        }

        processor.nextToken();
    }
}

/**
 * @param {string} inputCode The code to parse.
 * @param {string} [filePath] The source file name.
 */
export function parse(inputCode, filePath) {
    const code = removeInlineSourcemap(inputCode);
    const program = sucraseParse(code, true, true, false);
    const nameManager = new NameManager(code, program.tokens);
    const helperManager = new HelperManager(nameManager);
    const processor = new TokenProcessor(code, program.tokens, false, true, helperManager);
    const magicCode = new MagicString(code);

    let changed = false;

    return {
        program,
        nameManager,
        helperManager,
        processor,
        helpers: {
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
                    const newSourcemap = magicCode.generateMap({
                        source: filePath,
                        includeContent: options.sourcesContent,
                        hires: true,
                    });

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
