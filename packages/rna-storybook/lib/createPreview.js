import { PREVIEW_MODULE_SCRIPT } from './entrypoints.js';

/**
 * @typedef {Object} PreviewOptions
 * @property {string} framework
 * @property {import('./createStoriesJson.js').NormalizedStoriesSpecifier[]} specifiers
 * @property {string[]} [previewEntries]
 */

export async function createPreviewModule() {
    return `import createChannel from '@storybook/channel-postmessage';
import { PreviewWeb } from '@storybook/preview-web';
import { addons } from '@storybook/addons';
import { ClientApi } from '@storybook/client-api';

const channel = createChannel({ page: 'preview' });
addons.setChannel(channel);

const preview = new PreviewWeb();
const clientApi = new ClientApi({ storyStore: preview.storyStore });

window.__STORYBOOK_PREVIEW__ = preview;
window.__STORYBOOK_STORY_STORE__ = preview.storyStore;
window.__STORYBOOK_ADDONS_CHANNEL__ = channel;
window.__STORYBOOK_CLIENT_API__ = clientApi;

export default preview;`;
}

/**
 * @param {PreviewOptions} options
 */
export async function createPreviewScript({ framework, specifiers, previewEntries = [] }) {
    return `import { composeConfigs } from '@storybook/preview-web';
import preview from '${PREVIEW_MODULE_SCRIPT}';
import * as framework from '${framework}';
${previewEntries.map((previewScript, index) => `import * as preview${index} from '${previewScript}';`).join('\n')}

const importers = {
    ${specifiers.map(({ directory, files }) => `'${directory}/${files}': async () => import('${directory}/${files}?story')`).join(',\n')}
};

preview.initialize({
    importFn: (path) => importers[path](),
    getProjectAnnotations: () => composeConfigs([
        framework,
        ${previewEntries.map((previewScript, index) => `preview${index},`).join('\n')}
    ]),
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
