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
    return `export default {};${createEmptySourcemapComment}`;
}

/**
 * Escape RegExp modifiers in a string.
 * @param {string} source
 */
export function escapeRegexBody(source) {
    return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
