/**
 * @typedef {Object} PreviewOptions
 * @property {string} type
 * @property {string[]} stories
 * @property {string[]} [addons]
 * @property {string[]} [previewEntries]
 */

/**
 * @param {PreviewOptions} options
 */
export async function createPreviewScript({ type, stories = [], addons = [], previewEntries = [] }) {
    return `import { configure, addDecorator, addParameters } from '${type}';

function registerPreviewEntry(entry) {
    if (entry.decorators) {
        entry.decorators.forEach((decorator) => {
            addDecorator(decorator, false);
        });
    }

    if (entry.parameters || entry.globals || entry.globalTypes) {
        addParameters({
            ...(entry.parameters || {}),
            globals: entry.globals,
            globalTypes: entry.globalTypes,
        }, false);
    }
}

${[...addons, ...previewEntries].map((previewScript, index) => `import * as preview${index} from '${previewScript}';`).join('\n')}
${stories.map((story, i) => `import * as stories${i} from '${story}';`).join('\n')}

${[...addons, ...previewEntries].map((previewScript, index) => `registerPreviewEntry(preview${index});`).join('\n')}

setTimeout(() => {
    configure(() => [${stories.map((s, i) => `stories${i}`)}], {}, false);
});

try {
    if (window.top !== window) {
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = window.top.__REACT_DEVTOOLS_GLOBAL_HOOK__;
        window.__VUE_DEVTOOLS_GLOBAL_HOOK__ = window.top.__VUE_DEVTOOLS_GLOBAL_HOOK__;
        window.top.__VUE_DEVTOOLS_CONTEXT__ = window.document;
    }
} catch (e) {
    console.warn('unable to connect to top frame for connecting dev tools');
}`;
}
