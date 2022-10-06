import { TokenType, walk, extractFunctionArguments, getNextToken, nextBlock } from '@chialab/estransform';

/**
 * Check if the expression is assigning to `module.exports`.
 * @param {import('@chialab/estransform').TokenProcessor} processor
 * @param {string[]} args
 */
function checkUmdModuleAssignment(processor, args) {
    let token = processor.currentToken();
    if (token.type !== TokenType.name) {
        return false;
    }
    if (processor.identifierNameForToken(token) !== 'module') {
        return false;
    }
    token = getNextToken(processor);
    if (token.type !== TokenType.dot) {
        return false;
    }
    token = getNextToken(processor);
    if (token.type !== TokenType.name) {
        return false;
    }
    if (processor.identifierNameForToken(token) !== 'exports') {
        return false;
    }
    token = getNextToken(processor);
    if (token.type !== TokenType.eq) {
        return false;
    }
    token = getNextToken(processor);
    if (token.type !== TokenType.name) {
        return false;
    }
    if (processor.identifierNameForToken(token) !== args[1]) {
        return false;
    }
    token = getNextToken(processor);
    if (token.type !== TokenType.parenL) {
        return false;
    }
    processor.nextToken();
    nextBlock(processor);
    return !!processor.currentToken();
}

/**
 * Check if the expression is assigning to global `exports`.
 * @param {import('@chialab/estransform').TokenProcessor} processor
 * @param {string[]} args
 */
function checkUmdExportsAssignment(processor, args) {
    // 1. exports["name"] = factory();
    // 2. exports = factory();
    // 3. factory(exports);
    let token = processor.currentToken();
    if (token.type !== TokenType.name) {
        return false;
    }

    const identifier = processor.identifierNameForToken(token);
    if (identifier === 'exports') {
        // 1 | 2
        token = getNextToken(processor);
        if (token.type === TokenType.bracketL) {
            // 1
            token = getNextToken(processor);
            if (token.type !== TokenType.string) {
                return false;
            }
            token = getNextToken(processor);
            if (token.type !== TokenType.bracketR) {
                return false;
            }
            token = getNextToken(processor);
        }

        // 2
        if (token.type !== TokenType.eq) {
            return false;
        }
        token = getNextToken(processor);
        if (token.type !== TokenType.name) {
            return false;
        }
        if (processor.identifierNameForToken(token) !== args[1]) {
            return false;
        }
        token = getNextToken(processor);
        if (token.type !== TokenType.parenL) {
            return false;
        }
        token = getNextToken(processor);
        nextBlock(processor);
        return !!processor.currentToken();
    }

    if (identifier === args[1]) {
        // 3
        token = getNextToken(processor);
        if (token.type !== TokenType.parenL) {
            return false;
        }
        token = getNextToken(processor);
        if (token.type !== TokenType.name) {
            return false;
        }
        if (processor.identifierNameForToken(token) !== 'exports') {
            return false;
        }
        nextBlock(processor);
        return !!processor.currentToken();
    }

    return false;
}

/**
 * Check if the expression is using `define()`.
 * @param {import('@chialab/estransform').TokenProcessor} processor
 */
function checkUmdDefineAssignment(processor) {
    let token = processor.currentToken();
    if (token.type !== TokenType.name) {
        return false;
    }
    if (processor.identifierNameForToken(token) !== 'define') {
        return false;
    }
    token = getNextToken(processor);
    if (token.type !== TokenType.parenL) {
        return false;
    }
    token = getNextToken(processor);
    if (token.type !== TokenType.bracketL) {
        return false;
    }
    token = getNextToken(processor);
    while (token && token.type !== TokenType.bracketR) {
        token = getNextToken(processor);
    }
    if (!token) {
        return false;
    }
    token = getNextToken(processor);
    if (token.type !== TokenType.comma) {
        return false;
    }
    nextBlock(processor);
    return !!processor.currentToken();
}

/**
 * Check if the expression is a string that matches the given value.
 * @param {import('@chialab/estransform').TokenProcessor} processor
 * @param {string} value
 */
function checkCurrentTokenValue(processor, value) {
    const token = processor.currentToken();
    if (token.type !== TokenType.string) {
        return false;
    }
    return processor.stringValueForToken(token) === value;
}

/**
 * Check if the current if is a check for a UMD definition.
 * @param {import('@chialab/estransform').TokenProcessor} processor
 * @param {string[]} args
 */
function isUmdCheck(processor, args) {
    let token = processor.currentToken();
    if (token.type !== TokenType._if) {
        return false;
    }
    token = getNextToken(processor);
    if (token.type !== TokenType.parenL) {
        return false;
    }
    token = getNextToken(processor);

    // 1 global exports
    // 1.1 typeof exports === 'object'
    // 2 amd define
    // 2.1 typeof define === 'function' && define.amd
    // 3 module.exports
    // 3.1 typeof exports === 'object' && typeof module === 'object'
    // 3.2 typeof module === 'object'
    // 3.3 typeof module === 'object' && typeof module.exports === 'object'
    // 3.4 typeof module === 'object' && typeof exports === 'object'
    // 3.5 typeof module === 'object' && module.exports

    if (token.type === TokenType._typeof) {
        // 1.1 | 2.1 | 3.1 | 3.2 | 3.3 | 3.4 | 3.5

        token = getNextToken(processor);
        if (token.type !== TokenType.name) {
            return false;
        }

        const identifier = processor.identifierNameForToken(token);
        if (identifier === 'exports') {
            // 1.1 | 3.1
            token = getNextToken(processor);
            if (token.type !== TokenType.equality) {
                return false;
            }
            token = getNextToken(processor);
            if (!checkCurrentTokenValue(processor, 'object')) {
                return false;
            }
            token = getNextToken(processor);
            if (processor.matches5(TokenType.logicalAND, TokenType._typeof, TokenType.name, TokenType.equality, TokenType.string)) {
                // 3.1
                processor.nextToken();
                token = getNextToken(processor);
                if (processor.identifierNameForToken(token) === 'module') {
                    token = getNextToken(processor);
                    if (token.type !== TokenType.equality) {
                        return false;
                    }
                    token = getNextToken(processor);
                    if (!checkCurrentTokenValue(processor, 'object')) {
                        return false;
                    }
                    token = getNextToken(processor);
                    if (token.type !== TokenType.parenR) {
                        return false;
                    }
                    token = getNextToken(processor);
                    const hasBrace = token.type === TokenType.braceL;
                    if (hasBrace) {
                        token = getNextToken(processor);
                    }
                    if (!checkUmdModuleAssignment(processor, args)) {
                        return false;
                    }
                    token = getNextToken(processor);
                    if (hasBrace && token.type !== TokenType.braceR) {
                        return false;
                    }
                    token = getNextToken(processor);
                    return true;
                }
            }
            nextBlock(processor);

            // 1.1
            token = getNextToken(processor);
            const hasBrace = token.type === TokenType.braceL;
            if (hasBrace) {
                token = getNextToken(processor);
            }
            if (!checkUmdExportsAssignment(processor, args)) {
                return false;
            }
            token = getNextToken(processor);
            if (token.type === TokenType.semi) {
                token = getNextToken(processor);
            }
            if (hasBrace) {
                if (token.type !== TokenType.braceR) {
                    return false;
                }
                processor.nextToken();
            }
            return true;
        }

        if (identifier === 'define') {
            // 2.1
            token = getNextToken(processor);
            if (token.type !== TokenType.equality) {
                return false;
            }
            token = getNextToken(processor);
            if (!checkCurrentTokenValue(processor, 'function')) {
                return false;
            }
            token = getNextToken(processor);
            if (token.type !== TokenType.logicalAND) {
                return false;
            }
            token = getNextToken(processor);
            if (token.type !== TokenType.name) {
                return false;
            }
            if (processor.identifierNameForToken(token) !== 'define') {
                return false;
            }
            token = getNextToken(processor);
            if (token.type !== TokenType.dot) {
                return false;
            }
            token = getNextToken(processor);
            if (token.type !== TokenType.name) {
                return false;
            }
            if (processor.identifierNameForToken(token) !== 'amd') {
                return false;
            }
            token = getNextToken(processor);
            if (token.type !== TokenType.parenR) {
                return false;
            }
            token = getNextToken(processor);
            const hasBrace = token.type === TokenType.braceL;
            if (hasBrace) {
                token = getNextToken(processor);
            }
            if (!checkUmdDefineAssignment(processor)) {
                return false;
            }
            token = getNextToken(processor);
            if (token.type === TokenType.semi) {
                token = getNextToken(processor);
            }
            if (hasBrace) {
                if (token.type !== TokenType.braceR) {
                    return false;
                }
                processor.nextToken();
            }
            return true;
        }

        if (identifier === 'module') {
            // 3.2 | 3.3 | 3.4 | 3.5
            token = getNextToken(processor);
            if (token.type !== TokenType.equality) {
                return false;
            }
            token = getNextToken(processor);
            if (!checkCurrentTokenValue(processor, 'object')) {
                return false;
            }
            token = getNextToken(processor);
            if (token.type === TokenType.logicalAND) {
                // 3.3 | 3.4 | 3.5
                token = getNextToken(processor);
                if (processor.matches4(TokenType.name, TokenType.dot, TokenType.name, TokenType.parenR)) {
                    // 3.5
                    if (processor.identifierNameForToken(token) !== 'module') {
                        return false;
                    }
                    processor.nextToken();
                    token = getNextToken(processor);
                    if (processor.identifierNameForToken(token) !== 'exports') {
                        return false;
                    }
                    token = getNextToken(processor);
                } else {
                    // @TODO
                    return false;
                }
            }

            if (token.type === TokenType.parenR) {
                // 3.2
                token = getNextToken(processor);
                const hasBrace = token.type === TokenType.braceL;
                if (hasBrace) {
                    token = getNextToken(processor);
                }
                if (!checkUmdModuleAssignment(processor, args)) {
                    return false;
                }
                token = getNextToken(processor);
                if (token.type === TokenType.semi) {
                    token = getNextToken(processor);
                }
                if (hasBrace) {
                    if (token.type !== TokenType.braceR) {
                        return false;
                    }
                    processor.nextToken();
                }
                return true;
            }

            return false;
        }

        return false;
    }

    return false;
}

/**
 * Detect variable name.
 * @param {import('@chialab/estransform').TokenProcessor} processor
 * @param {string[]} args
 * @returns {string|null}
 */
function extractUmdVariableName(processor, args) {
    // 1. root.name = factory();
    // 1. factory((root.name = {}));
    let token = processor.currentToken();
    if (token.type !== TokenType.name) {
        return null;
    }

    const identifier = processor.identifierNameForToken(token);
    if (identifier === args[0]) {
        // 1
        token = getNextToken(processor);
        if (token.type === TokenType.dot) {
            token = getNextToken(processor);
            if (token.type !== TokenType.name) {
                return null;
            }
            return processor.identifierNameForToken(token);
        }

        if (token.type === TokenType.bracketL) {
            token = getNextToken(processor);
            if (token.type !== TokenType.string) {
                return null;
            }
            return processor.stringValueForToken(token);
        }
    } else if (identifier === args[1]) {
        // 1
        token = getNextToken(processor);
        if (token.type !== TokenType.parenL) {
            return null;
        }
        token = getNextToken(processor);
        const hasParen = token.type === TokenType.parenL;
        if (hasParen) {
            token = getNextToken(processor);
        }
        const variableName = extractUmdVariableName(processor, args);
        if (!variableName) {
            return null;
        }
        nextBlock(processor);
        token = processor.currentToken();
        if (hasParen && token.type !== TokenType.parenR) {
            return null;
        }
        return variableName;
    }

    return null;
}

/**
 * Detect UMD global variable name.
 * @param {import('@chialab/estransform').TokenProcessor} processor
 */
export async function detectUmdGlobalVariable(processor) {
    /**
     * @type {string|null}
     */
    let variableName = null;
    let args;

    await walk(processor, (token) => {
        if (token.type === TokenType._function ||
            (token.type === TokenType.name && processor.identifierNameForToken(token) === 'function')
        ) {
            token = getNextToken(processor);
            if (token.type === TokenType.name) {
                token = getNextToken(processor);
            }

            if (token.type !== TokenType.parenL) {
                return;
            }

            token = getNextToken(processor);

            args = extractFunctionArguments(processor)
                .filter((arg) => arg.length === 1 && arg[0].type === TokenType.name)
                .map((arg) => processor.identifierNameAtIndex(arg[0].index));

            if (args.length !== 2) {
                return;
            }

            token = getNextToken(processor);

            if (token.type !== TokenType.braceL) {
                return;
            }

            token = getNextToken(processor);

            while (token) {
                if (!isUmdCheck(processor, args)) {
                    break;
                }
                token = processor.currentToken();
                if (token.type === TokenType._else) {
                    token = getNextToken(processor);

                    if (token.type === TokenType._if) {
                        continue;
                    }

                    if (token.type === TokenType.braceL) {
                        token = getNextToken(processor);
                    }

                    variableName = extractUmdVariableName(processor, args);
                    if (variableName) {
                        return false;
                    }

                    break;
                }
            }
        }
    });

    return variableName;
}
