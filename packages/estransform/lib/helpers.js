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
