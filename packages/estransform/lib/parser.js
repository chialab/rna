import { Parser as AcornParser } from 'acorn';
import jsx from 'acorn-jsx';
import { base, simple } from 'acorn-walk';
import { extend } from 'acorn-jsx-walk';

extend(base);

/**
 * @typedef {Object} Location
 * @property {number} line
 * @property {number} column
 */

/**
 * The Acorn parser used to generate AST.
 */
export const Parser = AcornParser.extend(/** @type {*} */(jsx()));

/**
 * Walk through the AST of a JavaScript source.
 */
export const walk = simple;

/**
 * Parse JavaScript code using the Acorn parser.
 * @param {string} code The code to parse.
 * @return {import('acorn').Node} The root AST node.
 */
export function parse(code) {
    return Parser.parse(code, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        locations: true,
    });
}

/**
 * Convert a location to byte offset.
 * @param {string} code
 * @param {Location} location
 * @return {number}
 */
export function getOffsetFromLocation(code, { line, column }) {
    let offest = 0;

    const lines = code.split('\n');
    for (let i = 0; i < line; i++) {
        if (i === line - 1) {
            offest += column;
            return offest;
        }
        offest += lines[i].length + 1;
    }

    return -1;
}

/**
 * Extract a list of JavaScript comments in the given code chunk.
 * @param {string} code
 * @return {string[]} A list of comments.
 */
export function parseComments(code) {
    const matches = code.match(/\/\*[\s\S]*?\*\/|(?:[^\\:]|^)\/\/.*$/gm);
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
