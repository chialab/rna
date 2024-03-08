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
 * @returns {string|undefined} The init token.
 */
export function getIdentifierValue(processor, id) {
    const { tokens } = processor;
    const name = processor.identifierNameForToken(id);
    let index = 0;
    let count = 0;
    let token = tokens[index++];
    while (index < tokens.length) {
        if (token.type === TokenType.braceL) {
            count++;
            token = tokens[index++];
            continue;
        }

        if (token.type === TokenType.braceR) {
            count--;
            token = tokens[index++];
            continue;
        }

        if (count) {
            token = tokens[index++];
            continue;
        }

        if (token.type !== TokenType._var && token.type !== TokenType._const && token.type !== TokenType._let) {
            token = tokens[index++];
            continue;
        }

        token = tokens[index++];
        if (token.type !== TokenType.name || processor.identifierNameForToken(token) !== name) {
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
 * Get token location.
 * @param {string} code Source code.
 * @param {number} index Token index.
 * @returns A location.
 */
export function getLocation(code, index) {
    let it = 0;
    let line = 1;
    let column = -1;

    if (index > code.length) {
        throw new Error('Token index exceeds source code length');
    }

    while (it <= index) {
        const char = code[it];
        if (char === '\n') {
            line++;
            column = -1;
        } else {
            column++;
        }
        it++;
    }

    return { line, column };
}

/**
 * Get a block of tokens.
 * @param {import('./parser.js').TokenProcessor} processor
 * @param {TokenType} [openingToken]
 * @param {TokenType} [closingToken]
 * @returns {import('./types.js').Token[]}
 */
export function getBlock(processor, openingToken = TokenType.braceL, closingToken = TokenType.braceR) {
    /**
     * @type {import('./types.js').Token | null}
     */
    let token = processor.currentToken();
    let count = 0;

    const block = [token];
    while (token && (token.type !== closingToken || count > 0)) {
        if (processor.isAtEnd() || token.type === TokenType.eof) {
            break;
        }
        token = getNextToken(processor);
        if (token) {
            block.push(token);
            if (token.type === openingToken) {
                count++;
            } else if (token.type === closingToken) {
                count--;
            }
        }
    }

    return block;
}

/**
 * @param {import('./parser.js').TokenProcessor} processor
 */
export function getStatement(processor) {
    /**
     * @type {import('./types.js').Token | null}
     */
    let token = processor.currentToken();
    let count = 0;

    const block = [token];
    while (token && (token.type !== TokenType.semi || count > 0)) {
        if (processor.isAtEnd() || token.type === TokenType.eof) {
            break;
        }
        token = getNextToken(processor);
        if (token) {
            block.push(token);
            if (token.type === TokenType.braceL || token.type === TokenType.parenL) {
                count++;
            } else if (token.type === TokenType.braceR || token.type === TokenType.parenR) {
                count--;
            }
        }
    }

    return block;
}

/**
 * Split tokens into function arguments.
 * @param {import('./types.js').Token[]} tokens
 * @returns {import('./types.js').Token[][]}
 */
export function splitArgs(tokens) {
    /**
     * @type {import('./types.js').Token[][]}
     */
    const args = [];

    /**
     * @type {import('./types.js').Token[]}
     */
    let currentArg = [];

    let count = 0;

    let token = tokens.shift();
    while (token) {
        if (token.type === TokenType.braceL || token.type === TokenType.parenL) {
            count++;
        } else if (token.type === TokenType.braceR || token.type === TokenType.parenR) {
            count--;
        }

        if (!count && token.type === TokenType.comma) {
            args.push(currentArg);
            currentArg = [];
            token = tokens.shift();
            continue;
        }

        currentArg.push(token);
        token = tokens.shift();
    }

    if (currentArg.length) {
        args.push(currentArg);
    }

    return args;
}

/**
 * Extract argument tokens for a function declaration.
 * @param {import('./parser.js').TokenProcessor} processor
 */
export function extractFunctionArguments(processor) {
    const args = [];

    let openParens = 0;
    let openBrackets = 0;
    let openBraces = 0;

    /**
     * @type {import('./types.js').Token | null}
     */
    let token = processor.currentToken();
    let arg = [];
    while ((token && token.type !== TokenType.parenR) || openParens || openBrackets || openBraces) {
        arg.push({
            ...token,
            index: processor.currentIndex(),
        });

        token = getNextToken(processor);
        if (!token) {
            break;
        }

        if (token.type === TokenType.parenL) {
            openParens++;
        }
        if (token.type === TokenType.parenR && openParens) {
            openParens--;
        }
        if (token.type === TokenType.bracketL) {
            openBrackets++;
        }
        if (token.type === TokenType.bracketR) {
            openBrackets--;
        }
        if (token.type === TokenType.braceL) {
            openBraces++;
        }
        if (token.type === TokenType.braceR) {
            openBraces--;
        }
        if (token.type === TokenType.comma && !openParens && !openBrackets && !openBraces) {
            args.push(arg);
            arg = [];

            token = getNextToken(processor);
        }
    }

    args.push(arg);

    return args;
}

/**
 * Move forward in tokens list and return the current token.
 * @param {import('./parser.js').TokenProcessor} processor
 * @returns {import('./types.js').Token|null}
 */
export function getNextToken(processor) {
    if (processor.isAtEnd()) {
        return null;
    }
    processor.nextToken();
    return processor.currentToken();
}

/**
 * Move forward until `)` closes the block.
 * @param {import('./parser.js').TokenProcessor} processor
 */
export function nextBlock(processor) {
    let openParens = 0;
    /**
     * @type {import('./types.js').Token | null}
     */
    let token = processor.currentToken();
    while (token && (token.type !== TokenType.parenR || openParens)) {
        if (token.type === TokenType.parenR) {
            openParens--;
        }
        token = getNextToken(processor);
        if (!token) {
            break;
        }
        if (token && token.type === TokenType.parenL) {
            openParens++;
        }
    }
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
