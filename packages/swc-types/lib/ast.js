/**
 * @return {import('@swc/core/types').Span}
 */
export function emptySpan() {
    return {
        start: 0,
        end: 0,
        ctxt: 0,
    };
}

/**
 * @param {string} str
 * @param {import('@swc/core/types').Span} span
 * @return {import('@swc/core/types').StringLiteral}
 */
export function stringLiteral(str, span) {
    return {
        span,
        type: 'StringLiteral',
        value: str,
        has_escape: false,
    };
}

/**
 * @param {number} num
 * @param {import('@swc/core/types').Span} span
 * @return {import('@swc/core/types').NumericLiteral}
 */
export function numericLiteral(num, span) {
    return {
        span,
        type: 'NumericLiteral',
        value: num,
    };
}

/**
 * @param {boolean} value
 * @param {import('@swc/core/types').Span} span
 * @return {import('@swc/core/types').BooleanLiteral}
 */
export function booleanLiteral(value, span) {
    return {
        span,
        type: 'BooleanLiteral',
        value,
    };
}

/**
 * @param {string} str
 * @param {import('@swc/core/types').Span} span
 * @return {import('@swc/core/types').Identifier}
 */
export function identifier(str, span) {
    return {
        span,
        type: 'Identifier',
        value: str,
        optional: false,
    };
}

/**
 * @param {import('@swc/core/types').Expression} arg
 * @param {import('@swc/core/types').Span} span
 * @return {import('@swc/core/types').SpreadElement}
 */
export function spreadElement(arg, span) {
    return {
        type: 'SpreadElement',
        spread: span,
        arguments: arg,
    };
}

/**
 * @param {import('@swc/core/types').Span} span
 * @return {import('@swc/core/types').NullLiteral}
 */
export function nullLiteral(span) {
    return {
        type: 'NullLiteral',
        span,
    };
}

/**
 * @param {string} pattern
 * @param {string} flags
 * @param {import('@swc/core/types').Span} span
 * @return {import('@swc/core/types').RegExpLiteral}
 */
export function regExpLiteral(pattern, flags, span) {
    return {
        type: 'RegExpLiteral',
        pattern,
        flags,
        span,
    };
}

/**
 * @param {import('@swc/core/types').BinaryOperator} operator
 * @param {import('@swc/core/types').Expression} left
 * @param {import('@swc/core/types').Expression} right
 * @param {import('@swc/core/types').Span} span
 * @return {import('@swc/core/types').BinaryExpression}
 */
export function binaryExpression(operator, left, right, span) {
    return {
        type: 'BinaryExpression',
        operator,
        left,
        right,
        span,
    };
}

/**
 * @param {import('@swc/core/types').UnaryOperator} operator
 * @param {import('@swc/core/types').Expression} argument
 * @param {import('@swc/core/types').Span} span
 * @return {import('@swc/core/types').UnaryExpression}
 */
export function unaryExpression(operator, argument, span) {
    return {
        type: 'UnaryExpression',
        operator,
        argument,
        span,
    };
}

/**
 * @param {import('@swc/core/types').PropertyName} key
 * @param {import('@swc/core/types').Expression} value
 * @return {import('@swc/core/types').Property}
 */
export function objectProperty(key, value) {
    return {
        type: 'KeyValueProperty',
        key,
        value,
    };
}

/**
 * @param {(import('@swc/core/types').Property|import('@swc/core/types').SpreadElement)[]} props
 * @param {import('@swc/core/types').Span} span
 * @return {import('@swc/core/types').ObjectExpression}
 */
export function objectExpression(props, span) {
    return {
        type: 'ObjectExpression',
        properties: props,
        span,
    };
}

/**
 * @param {import('@swc/core/types').Expression[]} elements
 * @param {import('@swc/core/types').Span} span
 * @return {import('@swc/core/types').ArrayExpression}
 */
export function arrayExpression(elements, span) {
    return {
        type: 'ArrayExpression',
        elements,
        span,
    };
}

/**
 * @param {import('@swc/core/types').Expression} callee
 * @param {import('@swc/core/types').Argument[]} args
 * @param {import('@swc/core/types').Span} span
 * @return {import('@swc/core/types').CallExpression}
 */
export function callExpression(callee, args, span) {
    return {
        type: 'CallExpression',
        callee,
        arguments: args,
        span,
    };
}

/**
 * @param {import('@swc/core/types').ClassDeclaration} clazz
 * @return {import('@swc/core/types').ClassExpression}
 */
export function classExpression(clazz) {
    return {
        ...clazz,
        type: 'ClassExpression',
    };
}

/**
 * @param {import('@swc/core/types').Identifier} id
 * @param {import('@swc/core/types').Expression} init
 * @param {import('@swc/core/types').Span} span
 * @return {import('@swc/core/types').VariableDeclarator}
 */
export function variableDeclarator(id, init, span) {
    return {
        type: 'VariableDeclarator',
        id,
        definite: true,
        init,
        span,
    };
}

/**
 * @param {import('@swc/core/types').VariableDeclarator[]} declarations
 * @param {import('@swc/core/types').Span} span
 * @return {import('@swc/core/types').VariableDeclaration}
 */
export function variableDeclaration(declarations, span) {
    return {
        type: 'VariableDeclaration',
        kind: 'var',
        declare: false,
        declarations,
        span,
    };
}

/**
 * @param {import('@swc/core/types').ImportSpecifier[]} specifiers
 * @param {import('@swc/core/types').StringLiteral} source
 * @param {import('@swc/core/types').Span} span
 * @return {import('@swc/core/types').ImportDeclaration & { typeOnly: boolean }}
 */
export function importDeclaration(specifiers, source, span) {
    return {
        type: 'ImportDeclaration',
        specifiers,
        source,
        typeOnly: false,
        span,
    };
}

/**
 * @param {import('@swc/core/types').Identifier} id
 * @param {import('@swc/core/types').Span} span
 * @return {import('@swc/core/types').ImportDefaultSpecifier}
 */
export function importDefaultSpecifier(id, span) {
    return {
        type: 'ImportDefaultSpecifier',
        local: id,
        span,
    };
}

/**
 * @param {import('@swc/core/types').Expression} exp
 * @param {import('@swc/core/types').Span} span
 * @return {import('@swc/core/types').ExpressionStatement}
 */
export function expressionStatement(exp, span) {
    return {
        type: 'ExpressionStatement',
        expression: exp,
        span,
    };
}

/**
 * @param {*} exp
 * @return {exp is import('@swc/core/types').ArrayExpression}
 */
export function isArrayExpression(exp) {
    return exp.type === 'ArrayExpression';
}

/**
 * @param {*} obj
 * @return {obj is import('@swc/core/types').Node}
 */
export function isNode(obj) {
    return typeof obj.type === 'string';
}

/**
 * @param {*} node
 * @return {node is import('@swc/core/types').ImportDeclaration}
 */
export function isImportDeclaration(node) {
    return node.type === 'ImportDeclaration';
}

/**
 * @param {*} value
 * @return {value is RegExp}
 */
export function isRegExp(value) {
    const objectToString = Function.call.bind(Object.prototype.toString);
    return objectToString(value) === '[object RegExp]';
}

/**
 * @param {*} value
 * @return {value is object}
 */
export function isPlainObject(value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const proto = Object.getPrototypeOf(value);
    return proto === null || proto === Object.prototype;
}

/**
 * @param {*} value
 * @param {import('@swc/core/types').Span} span
 * @return {import('@swc/core/types').Expression}
 */
export function valueToNode(value, span) {
    // undefined
    if (value === undefined) {
        return identifier('undefined', span);
    }

    // boolean
    if (value === true || value === false) {
        return booleanLiteral(value, span);
    }

    // null
    if (value === null) {
        return nullLiteral(span);
    }

    // strings
    if (typeof value === 'string') {
        return stringLiteral(value, span);
    }

    // numbers
    if (typeof value === 'number') {
        let result;
        if (Number.isFinite(value)) {
            result = numericLiteral(Math.abs(value), span);
        } else {
            let numerator;
            if (Number.isNaN(value)) {
                // NaN
                numerator = numericLiteral(0, span);
            } else {
                // Infinity / -Infinity
                numerator = numericLiteral(1, span);
            }

            result = binaryExpression('/', numerator, numericLiteral(0, span), span);
        }

        if (value < 0 || Object.is(value, -0)) {
            result = unaryExpression('-', result, span);
        }

        return result;
    }

    // regexes
    if (isRegExp(value)) {
        const pattern = value.source;
        const flags = (/** @type {RegExpMatchArray} */ (value.toString().match(/\/([a-z]+|)$/)))[1];
        return regExpLiteral(pattern, flags, span);
    }

    // array
    if (Array.isArray(value)) {
        return arrayExpression(value.map((item) => valueToNode(item, span)), span);
    }

    // object
    if (isPlainObject(value)) {
        const props = [];
        for (const [key, val] of Object.entries(value)) {
            const nodeKey = stringLiteral(key, span);
            props.push(objectProperty(nodeKey, valueToNode(val, span)));
        }
        return objectExpression(props, span);
    }

    throw new Error('don\'t know how to turn this value into a node');
}
