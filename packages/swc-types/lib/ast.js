/**
 * @param {string} str
 * @return {import('@swc/core/types').StringLiteral}
 */
export function stringLiteral(str) {
    return {
        span: {
            start: 0,
            end: 0,
            ctxt: 0,
        },
        type: 'StringLiteral',
        value: str,
        has_escape: false,
    };
}

/**
 * @param {number} num
 * @return {import('@swc/core/types').NumericLiteral}
 */
export function numericLiteral(num) {
    return {
        span: {
            start: 0,
            end: 0,
            ctxt: 0,
        },
        type: 'NumericLiteral',
        value: num,
    };
}

/**
 * @param {boolean} value
 * @return {import('@swc/core/types').BooleanLiteral}
 */
export function booleanLiteral(value) {
    return {
        span: {
            start: 0,
            end: 0,
            ctxt: 0,
        },
        type: 'BooleanLiteral',
        value,
    };
}

/**
 * @param {string} str
 * @return {import('@swc/core/types').Identifier}
 */
export function identifier(str) {
    return {
        span: {
            start: 0,
            end: 0,
            ctxt: 0,
        },
        type: 'Identifier',
        value: str,
        optional: false,
    };
}

/**
 * @param {import('@swc/core/types').Expression} arg
 * @return {import('@swc/core/types').SpreadElement}
 */
export function spreadElement(arg) {
    return {
        type: 'SpreadElement',
        spread: {
            start: 0,
            end: 0,
            ctxt: 0,
        },
        arguments: arg,
    };
}

/**
 * @return {import('@swc/core/types').NullLiteral}
 */
export function nullLiteral() {
    return {
        type: 'NullLiteral',
        span: {
            start: 0,
            end: 0,
            ctxt: 0,
        },
    };
}

/**
 * @param {string} pattern
 * @param {string} flags
 * @return {import('@swc/core/types').RegExpLiteral}
 */
export function regExpLiteral(pattern, flags) {
    return {
        type: 'RegExpLiteral',
        pattern,
        flags,
        span: {
            start: 0,
            end: 0,
            ctxt: 0,
        },
    };
}

/**
 * @param {import('@swc/core/types').BinaryOperator} operator
 * @param {import('@swc/core/types').Expression} left
 * @param {import('@swc/core/types').Expression} right
 * @return {import('@swc/core/types').BinaryExpression}
 */
export function binaryExpression(operator, left, right) {
    return {
        type: 'BinaryExpression',
        operator,
        left,
        right,
        span: {
            start: 0,
            end: 0,
            ctxt: 0,
        },
    };
}

/**
 * @param {import('@swc/core/types').UnaryOperator} operator
 * @param {import('@swc/core/types').Expression} argument
 * @return {import('@swc/core/types').UnaryExpression}
 */
export function unaryExpression(operator, argument) {
    return {
        type: 'UnaryExpression',
        operator,
        argument,
        span: {
            start: 0,
            end: 0,
            ctxt: 0,
        },
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
 * @return {import('@swc/core/types').ObjectExpression}
 */
export function objectExpression(props) {
    return {
        type: 'ObjectExpression',
        properties: props,
        span: {
            start: 0,
            end: 0,
            ctxt: 0,
        },
    };
}

/**
 * @param {import('@swc/core/types').Expression[]} elements
 * @return {import('@swc/core/types').ArrayExpression}
 */
export function arrayExpression(elements) {
    return {
        type: 'ArrayExpression',
        elements,
        span: {
            start: 0,
            end: 0,
            ctxt: 0,
        },
    };
}

/**
 * @param {import('@swc/core/types').Expression} callee
 * @param {import('@swc/core/types').Argument[]} args
 * @return {import('@swc/core/types').CallExpression}
 */
export function callExpression(callee, args) {
    return {
        type: 'CallExpression',
        callee,
        arguments: args,
        span: {
            start: 0,
            end: 0,
            ctxt: 0,
        },
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
 * @return {import('@swc/core/types').VariableDeclarator}
 */
export function variableDeclarator(id, init) {
    return {
        type: 'VariableDeclarator',
        id,
        definite: true,
        init,
        span: {
            start: 0,
            end: 0,
            ctxt: 0,
        },
    };
}

/**
 * @param {import('@swc/core/types').VariableDeclarator[]} declarations
 * @return {import('@swc/core/types').VariableDeclaration}
 */
export function variableDeclaration(declarations) {
    return {
        type: 'VariableDeclaration',
        kind: 'var',
        declare: false,
        declarations,
        span: {
            start: 0,
            end: 0,
            ctxt: 0,
        },
    };
}

/**
 * @param {import('@swc/core/types').Expression} exp
 * @return {import('@swc/core/types').ExpressionStatement}
 */
export function  expressionStatement(exp) {
    return {
        type: 'ExpressionStatement',
        expression: exp,
        span: {
            start: 0,
            end: 0,
            ctxt: 0,
        },
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
    let proto = Object.getPrototypeOf(value);
    return proto === null || proto === Object.prototype;
}

/**
 * @param {*} value
 * @return {import('@swc/core/types').Expression}
 */
export function valueToNode(value) {
    // undefined
    if (value === undefined) {
        return identifier('undefined');
    }

    // boolean
    if (value === true || value === false) {
        return booleanLiteral(value);
    }

    // null
    if (value === null) {
        return nullLiteral();
    }

    // strings
    if (typeof value === 'string') {
        return stringLiteral(value);
    }

    // numbers
    if (typeof value === 'number') {
        let result;
        if (Number.isFinite(value)) {
            result = numericLiteral(Math.abs(value));
        } else {
            let numerator;
            if (Number.isNaN(value)) {
                // NaN
                numerator = numericLiteral(0);
            } else {
                // Infinity / -Infinity
                numerator = numericLiteral(1);
            }

            result = binaryExpression('/', numerator, numericLiteral(0));
        }

        if (value < 0 || Object.is(value, -0)) {
            result = unaryExpression('-', result);
        }

        return result;
    }

    // regexes
    if (isRegExp(value)) {
        let pattern = value.source;
        let flags = (/** @type {RegExpMatchArray} */ (value.toString().match(/\/([a-z]+|)$/)))[1];
        return regExpLiteral(pattern, flags);
    }

    // array
    if (Array.isArray(value)) {
        return arrayExpression(value.map(valueToNode));
    }

    // object
    if (isPlainObject(value)) {
        let props = [];
        for (let [key, val] of Object.entries(value)) {
            let nodeKey = stringLiteral(key);
            props.push(objectProperty(nodeKey, valueToNode(val)));
        }
        return objectExpression(props);
    }

    throw new Error('don\'t know how to turn this value into a node');
}
