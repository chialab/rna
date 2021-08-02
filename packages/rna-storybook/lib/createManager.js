/**
 * @typedef {Object} ManagerOptions
 * @property {string} [managerHead]
 * @property {{ path: string }} [css]
 * @property {{ path: string, type: 'module'|'text/javascript' }} [js]
 */

/**
 * @typedef {Object} ManagerScriptOptions
 * @property {string[]} [addons]
 * @property {string[]} [managerEntries]
 */

/**
 * @param {ManagerScriptOptions} [options]
 */
export function createManagerScript({ addons = [], managerEntries = [] } = {}) {
    return `import '@storybook/manager';
${addons.map((a) => `import '${a}';`).join('\n')}
${managerEntries.map((a) => `import '${a}';`).join('\n')}
`;
}

export function createManagerStyle() {
    return `html,
body {
    overflow: hidden;
    height: 100%;
    width: 100%;
    margin: 0;
    padding: 0;
}

#root[hidden],
#docs-root[hidden] {
    display: none !important;
}`;
}

/**
 * @param {ManagerOptions} [options]
 */
export function createManagerHtml({
    managerHead = '',
    css = { path: 'manager.css' },
    js = { path: 'manager.js', type: 'text/javascript' },
} = {}) {
    return `<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Storybook</title>
        <link href="${css.path}" rel="stylesheet">
        ${managerHead || ''}
    </head>
    <body>
        <div id="root"></div>
        <div id="docs-root"></div>
        <script type="${js.type}" src="${js.path}"></script>
    </body>
</html>`;
}
