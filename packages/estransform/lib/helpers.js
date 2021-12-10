import { TokenType } from './types.js';

/**
 * Create a empty sourcemap comment.
 */
export function createEmptySourcemapComment() {
    return '\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJtYXBwaW5ncyI6IkEifQ==';
}

/**
 * Create a empty module with an empty default object.
 */
export function createEmptyModule() {
    return `export default {};${createEmptySourcemapComment()}`;
}

/**
 * Detect first level identifier for esbuild file loader imports.
 * File could be previously bundled using esbuild, so the first argument of a new URL(something, import.meta.url)
 * is not a literal anymore but an identifier.
 * Here, we are looking for its computed value.
 * @param {import('./parser.js').TokenProcessor} processor The program processor.
 * @param {import('./types.js').Token} id The name of the identifier.
 * @return {string|undefined} The init token.
 */
export function getIdentifierValue(processor, id) {
    const { tokens } = processor;
    const name = processor.identifierNameForToken(id);
    let index = 0;
    let token = tokens[index++];
    while (index < tokens.length) {
        if (token.type !== TokenType._var
            && token.type !== TokenType._const
            && token.type !== TokenType._let
        ) {
            token = tokens[index++];
            continue;
        }

        token = tokens[index++];
        if (token.type !== TokenType.name
            || processor.identifierNameForToken(token) !== name) {
            continue;
        }

        // =
        index++;

        token = tokens[index++];
        if (token.type !== TokenType.string) {
            continue;
        }

        return processor.stringValueForToken(token);
    }
}

/**
 * @param {import('./parser.js').TokenProcessor} processor
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
