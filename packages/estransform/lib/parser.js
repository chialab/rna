import MagicString from 'magic-string';
import { parse as sucraseParse } from 'sucrase/dist/parser/index.js';
import NameManagerModule from 'sucrase/dist/NameManager.js';
import { HelperManager } from 'sucrase/dist/HelperManager.js';
import TokenProcessorModule from 'sucrase/dist/TokenProcessor.js';

/**
 * @param {*} mod
 */
function interopImport(mod) {
    return (typeof mod.default !== 'undefined' ? mod.default : mod);
}

export const NameManager = /** @type {typeof import('sucrase/dist/NameManager').default} */ (interopImport(NameManagerModule));
export const TokenProcessor = /** @type {typeof import('sucrase/dist/TokenProcessor').default} */ (interopImport(TokenProcessorModule));

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

        processor.nextToken();
    }
}

/**
 * @param {string} code The code to parse.
 * @param {string} [fileName] The source file name.
 */
export function parse(code, fileName) {
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
             * @param {{ sourcemap?: boolean; sourcesContent?: boolean }} options
             */
            generate(options = {}) {
                return {
                    code: magicCode.toString(),
                    map: options.sourcemap ? magicCode.generateMap({
                        source: fileName,
                        includeContent: options.sourcesContent,
                        hires: true,
                    }) : null,
                };
            },
        },
    };
}
