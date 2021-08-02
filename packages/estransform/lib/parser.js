import { Parser as AcornParser } from 'acorn';
import jsx from 'acorn-jsx';
import { simple as walk } from 'acorn-walk';

export const Parser = AcornParser.extend(/** @type {*} */(jsx()));

export { walk };

/**
 * @param {string} contents
 */
export function parse(contents) {
    return Parser.parse(contents, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        locations: true,
    });
}

/**
 * @param {string} code
 * @param {number} line
 * @param {number} column
 */
export function getOffsetFromLocation(code, line, column) {
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
