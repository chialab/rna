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
        return new RegExp(`^${regexBody}$`);
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
        return new RegExp(`(${regexBody})$`);
    }

    if (mode === ALIAS_MODE.START) {
        return new RegExp(`^(${regexBody})`);
    }

    return new RegExp(`(^|\\/)(${regexBody})(\\/|$)`);
}

/**
 * Extract a list of mapped modules from an alias map.
 * @param {AliasMap} aliasMap
 * @param {string[]} external
 */
export function getMappedModules(aliasMap, external = []) {
    return Object.keys(aliasMap)
        .filter((alias) => !external.includes(alias) && aliasMap[alias]);
}

/**
 * Extract a list of empty modules from an alias map.
 * @param {AliasMap} aliasMap
 * @param {string[]} external
 */
export function getEmptyModules(aliasMap, external = []) {
    return Object.keys(aliasMap)
        .filter((alias) => !external.includes(alias) && !aliasMap[alias]);
}

/**
 * Create a map of regex/resolutions for an alias map.
 * @param {AliasMap} aliasMap
 * @param {ALIAS_MODE} [mode]
 */
export function createAliasRegexexMap(aliasMap, mode = ALIAS_MODE.ANY) {
    /**
     * @type {Map<RegExp, { key: string, value: string|false }>}
     */
    const map = new Map();
    for (const key in aliasMap) {
        const regex = createAliasRegex(key, mode);
        map.set(regex, {
            key,
            value: aliasMap[key],
        });
    }

    return map;
}

/**
 * Create a regex for empty modules.
 * @param {AliasMap} aliasMap
 * @param {ALIAS_MODE} [mode]
 */
export function createEmptyRegex(aliasMap, mode = ALIAS_MODE.ANY) {
    const empty = getEmptyModules(aliasMap);
    return createAliasesRegex(empty.length ? empty : ['_'], mode);
}
