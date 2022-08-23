/**
 * @typedef {Object} ManagerOptions
 * @property {string[]} [managerEntries]
 */

/**
 * @param {ManagerOptions} options
 */
export function createManagerScript({ managerEntries = [] }) {
    return managerEntries.map((a) => `import '${a}';`).join('\n');
}
