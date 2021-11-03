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
    // Swc uses byte offsets while magic string uses string offsets.
    // So, we need to convert double byte characters to single byte.
    if (Buffer.byteLength(code) !== code.length) {
        let str = '';
        for (let i = 0, len = code.length; i < len; i++) {
            const char = code[i];
            if (Buffer.byteLength(char, 'utf8') > 1) {
                str += '-';
            } else {
                str += char;
            }
        }

        code = str;
    }

    // We add an empty expression statement at the begin of the file in order
    // to compute the correct offset for files that starts with comments and spaces.
    const ast = await swcParse(`;${code}`, {
        syntax: 'typescript',
        tsx: true,
        decorators: true,
        dynamicImport: true,
        // does not work with js api
        comments: false,
    });

    return ast;
}

/**
 * Swc does not reset the parser state after parsing.
 * So, spans need to be re-indexed.
 * @param {import('./types.js').Program} program
 * @param {import('./types.js').Node & import('@swc/core').HasSpan} node
 * @returns
 */
export function getSpanLocation(program, node) {
    return {
        start: node.span.start - program.span.start - 1,
        end: node.span.end - program.span.start - 1,
    };
}

/**
 * Extract comments for a code range delmited by node span.
 * @param {string} code The original code.
 * @param {import('./types.js').Program} program The program ast.
 * @param {import('./types.js').Node & import('@swc/core').HasSpan} node The requested node.
 */
export function getNodeComments(code, program, node) {
    const loc = getSpanLocation(program, node);
    const chunk = code.substr(loc.start, loc.end - loc.start);
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
