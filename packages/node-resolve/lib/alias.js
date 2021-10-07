/**
 * @typedef {{ [key: string]: string|false }} AliasMap
 */

/**
 * Escape RegExp modifiers in a string.
 * @param {string} source
 */
export function escapeRegexBody(source) {
    return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @enum {number}
 */
export const ALIAS_MODE = {
    ANY: 0,
    START: 1,
    FULL: 2,
};

/**
 * Create a regex for alias match.
 * @param {string} entry
 * @param {ALIAS_MODE} [mode]
 */
export function createAliasRegex(entry, mode = ALIAS_MODE.ANY) {
    const regexBody = escapeRegexBody(entry);
    if (mode === ALIAS_MODE.FULL) {
        return new RegExp(`${regexBody}$`);
    }

    if (mode === ALIAS_MODE.START) {
        return new RegExp(`^${regexBody}`);
    }

    return new RegExp(`(^|\\/)${regexBody}(\\/|$)`);
}

/**
 * Create a regex for multiple aliases match.
 * @param {string[]} entries
 * @param {ALIAS_MODE} [mode]
 */
export function createAliasesRegex(entries, mode = ALIAS_MODE.ANY) {
    const regexBody = entries.map(escapeRegexBody).join('|');
    if (mode === ALIAS_MODE.FULL) {
        return new RegExp(`${regexBody}$`);
    }

    if (mode === ALIAS_MODE.START) {
        return new RegExp(`^${regexBody}`);
    }

    return new RegExp(`(^|\\/)${regexBody}(\\/|$)`);
}
