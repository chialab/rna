import { parse as swcParse } from '@swc/core';
import { Visitor as swcVisitor } from '@swc/core/Visitor.js';

/**
 * @typedef {{ [ K in keyof swcVisitor ]: K extends `visit${infer V}` ? V : never }[keyof swcVisitor]} VisitorKeys
 */

/**
 * @typedef {{ [key in VisitorKeys]?: (node: Parameters<swcVisitor[`visit${key}`]>[0]) => ReturnType<swcVisitor[`visit${key}`]> | void }} Visitor
 */

/**
 * Walk through the AST of a JavaScript source.
 * @param {import('./types.js').Node} node
 * @param {Visitor} visitor
 */
export const walk = (node, visitor) => {
    const v = new swcVisitor();
    const type = /** @type {'Program'} */ (node.type);
    const keys = /** @type {VisitorKeys[]} */ (Object.keys(visitor));

    // Fix missing method in swc
    v.visitTsType = (node) => node;

    keys.forEach((nodeType) => {
        if (!visitor[nodeType]) {
            return;
        }
        const callback = /** @type {swcVisitor['visitProgram']} */ (visitor[nodeType]);
        const methodKey = /** @type {'visitProgram'} */ (`visit${nodeType}`);
        const original = v[methodKey];

        /**
         * @param {Parameters<typeof original>[0]} node
         */
        v[methodKey] = function(node) {
            const result = callback.call(this, node);
            if (result !== undefined) {
                return result;
            }

            return original.call(this, node);
        };
    });

    return v[`visit${type}`](/** @type {import('./types.js').Program} */ (node));
};

/**
 * Parse JavaScript code using the SWC parser.
 * @param {string} code The code to parse.
 * @return The root AST node.
 */
export async function parse(code) {
    return swcParse(code, {
        syntax: 'typescript',
        tsx: true,
        decorators: true,
        dynamicImport: true,
        comments: true,
    });
}

/**
 * @param {import('./types.js').Program} program
 * @param {import('./types.js').Node & import('@swc/core').HasSpan} node
 * @returns
 */
export function getSpanLocation(program, node) {
    return {
        start: node.span.start - program.span.start,
        end: node.span.end - program.span.start,
    };
}
