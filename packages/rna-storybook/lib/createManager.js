/**
 * @typedef {Object} ManagerOptions
 * @property {string} manager
 * @property {string[]} [managerEntries]
 */

/**
 * @param {ManagerOptions} options
 */
export function createManagerScript({ manager, managerEntries = [] }) {
    return [
        manager,
        ...managerEntries,
    ].map((a) => `import '${a}';`).join('\n');
}
