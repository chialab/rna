/**
 * @typedef {Object} ManagerOptions
 * @property {string[]} [addons]
 * @property {string[]} [managerEntries]
 */

/**
 * @param {ManagerOptions} [options]
 */
export function createManagerScript({ addons = [], managerEntries = [] } = {}) {
    return `import '@storybook/manager';
${addons.map((a) => `import '${a}';`).join('\n')}
${managerEntries.map((a) => `import '${a}';`).join('\n')}
`;
}
