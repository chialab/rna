/**
 * @typedef {Object} ManagerOptions
 * @property {string} manager
 * @property {string[]} [addons]
 * @property {string[]} [managerEntries]
 */

/**
 * @param {ManagerOptions} options
 */
export function createManagerScript({ manager, addons = [], managerEntries = [] }) {
    return [
        manager,
        ...managerEntries,
        ...addons,
    ].map((a) => `import '${a}';`).join('\n');
}
