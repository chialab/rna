/**
 * @typedef {Object} PreviewOptions
 * @property {string} type
 * @property {string[]} stories
 * @property {string[]} [previewEntries]
 */

/**
 * @param {PreviewOptions} options
 */
export async function createPreviewScript({ type, stories = [], previewEntries = [] }) {
    return `import { configure, registerPreviewEntry } from '@storybook/${type}';
${previewEntries.map((previewScript, index) => `import * as preview${index} from '${previewScript}';`).join('\n')}
${stories.map((story, i) => `import * as stories${i} from '${story}';`).join('\n')}

${previewEntries.map((previewScript, index) => `registerPreviewEntry(preview${index});`).join('\n')}

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
