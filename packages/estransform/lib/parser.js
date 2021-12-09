import { parse as sucraseParse } from 'sucrase/dist/parser/index.js';
import NameManagerModule from 'sucrase/dist/NameManager.js';
import { HelperManager } from 'sucrase/dist/HelperManager.js';
import TokenProcessorModule from 'sucrase/dist/TokenProcessor.js';
import { TokenType } from './types.js';

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

/**
 * @param {InstanceType<TokenProcessor>} processor
 * @param {TokenType} [openingToken]
 * @param {TokenType} [closingToken]
 */
export function getBlock(processor, openingToken = TokenType.braceL, closingToken = TokenType.braceR) {
    let token = processor.currentToken();
    let count = 0;

    const block = [token];
    while (!processor.isAtEnd() && (token.type !== closingToken || count > 0)) {
        processor.nextToken();
        token = processor.currentToken();
        block.push(token);
        if (token.type === openingToken) {
            count++;
        } if (token.type === closingToken) {
            count--;
        }
    }

    return block;
}

/**
 * Extract comments for a code range delmited by node span.
 * @param {string} code The original code.
 * @param {number} start The start index.
 * @param {number} end The end index.
 */
export function getNodeComments(code, start, end) {
    const chunk = code.substring(start, end);
    const matches = chunk.match(/\/\*[\s\S]*?\*\/|(?:[^\\:]|^)\/\/.*$/gm);
    if (!matches) {
        return [];
    }

    return matches.map((comment) =>
        // remove comment delimiters
        comment
            .trim()
            .replace(/^\/\*+\s*/, '')
            .replace(/\s*\*+\/$/, '')
            .replace(/^\/\/\s*/, '')
    );
}
