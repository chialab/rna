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
 */
export function parse(code) {
    const program = sucraseParse(code, true, true, false);
    const nameManager = new NameManager(code, program.tokens);
    const helperManager = new HelperManager(nameManager);
    const processor = new TokenProcessor(code, program.tokens, false, true, helperManager);

    return {
        program,
        nameManager,
        helperManager,
        processor,
    };
}
