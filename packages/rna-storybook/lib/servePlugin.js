import path from 'path';
import { readFile } from 'fs/promises';
import esbuild from 'esbuild';
import { isCss, isJson, isUrl, appendSearchParam } from '@chialab/node-resolve';
import { getRequestFilePath } from '@chialab/es-dev-server';
import { appendCssModuleParam, appendJsonModuleParam } from '@chialab/wds-plugin-rna';
import { definitions } from '@storybook/ui/dist/globals';
import { indexHtml, iframeHtml, managerCss, previewCss } from './templates.js';
import { createManagerScript } from './createManager.js';
import { createPreviewModule, createPreviewScript } from './createPreview.js';
import { transformMdxToCsf } from './transformMdxToCsf.js';
import { createStoryIndexGenerator } from './createStoryIndexGenerator.js';
import { MANAGER_SCRIPT, MANAGER_STYLE, PREVIEW_SCRIPT, PREVIEW_MODULE_SCRIPT, PREVIEW_STYLE } from './entrypoints.js';

const regexpReplaceWebsocket = /<!-- injected by web-dev-server -->(.|\s)*<\/script>/m;

/**
 * @param {import('./index.js').StorybookConfig} config
 */
export function servePlugin(config) {
    const {
        framework,
        stories: storiesPattern,
        static: staticFiles = {},
        managerEntries = [],
        previewEntries = [],
        managerHead,
        previewHead,
        previewBody,
    } = config;

    /**
     * @type {import('@chialab/es-dev-server').DevServerCoreConfig}
     */
    let serverConfig;

    /**
     * @type {Promise<import('./StoryIndexGenerator.js').StoryIndexGenerator>}
     */
    let generatorPromise;

    /**
     * @type {import('@chialab/es-dev-server').Plugin}
     */
    const plugin = {
        name: 'rna-storybook',
        enforce: 'pre',

        async serverStart(args) {
            serverConfig = args.config;

            const { rootDir } = serverConfig;
            const fileWatcher = args.fileWatcher;

            generatorPromise = createStoryIndexGenerator(rootDir, storiesPattern, {
                storySort: config.storySort,
            });

            /**
             * @param {string} filePath
             */
            const onFileChanged = (filePath) => {
                for (const fileName in staticFiles) {
                    if (staticFiles[fileName] === filePath) {
                        setTimeout(() => {
                            // debounce change event in order to correctly handle hmr queue
                            fileWatcher.emit('change', path.resolve(rootDir, fileName));
                        });
                    }
                }
            };

            fileWatcher.on('change', (filePath) => onFileChanged(filePath));
            fileWatcher.on('unlink', (filePath) => onFileChanged(filePath));

            for (const fileName in staticFiles) {
                fileWatcher.add(path.resolve(rootDir, staticFiles[fileName]));
            }
        },

        resolveMimeType(context) {
            if (context.path.endsWith('.mdx')) {
                return 'js';
            }
        },

        transformImport({ source, context }) {
            if (isJson(source) || isCss(source)) {
                return;
            }

            if (isUrl(source)) {
                return;
            }

            if (isCss(source)) {
                source = appendCssModuleParam(source);
            }

            if (isJson(source)) {
                source = appendJsonModuleParam(source);
            }

            if (source === PREVIEW_MODULE_SCRIPT) {
                return `/${PREVIEW_MODULE_SCRIPT}`;
            }

            if (context.path === `/${MANAGER_SCRIPT}` ||
                context.URL.searchParams.has('manager')) {
                return appendSearchParam(source, 'manager', 'true');
            }
        },

        async resolveImport({ context, source }) {
            if (source === PREVIEW_MODULE_SCRIPT) {
                return source;
            }

            if (context.URL.searchParams.has('manager')) {
                if (source in definitions) {
                    return `/__storybook_ui__/${source}`;
                }
            }
        },

        async transform(context) {
            if (context.path === '/') {
                // replace the injected websocket script to avoid reloading the manager in watch mode
                context.body = (/** @type {string} */ (context.body)).replace(regexpReplaceWebsocket, '');
                return;
            }
        },

        async serve(context) {
            if (!serverConfig) {
                return;
            }

            const { rootDir } = serverConfig;

            if (context.path === '/') {
                return indexHtml({
                    managerHead: managerHead || '',
                    css: [{
                        path: `/${MANAGER_STYLE}`,
                    }],
                    js: [{
                        path: `/${MANAGER_SCRIPT}`,
                        type: 'module',
                    }],
                });
            }

            if (context.path === '/index.json' || context.path === '/stories.json') {
                const generator = await generatorPromise;
                const index = await generator.getIndex();

                return {
                    body: JSON.stringify(index),
                };
            }

            if (context.path === '/iframe.html') {
                return iframeHtml({
                    previewHead: previewHead || '',
                    previewBody: `${previewBody || ''}
<script type="module" src="/__web-dev-server__web-socket.js"></script>`,
                    css: [{
                        path: `/${PREVIEW_STYLE}`,
                    }],
                    js: [{
                        path: `/${PREVIEW_SCRIPT}`,
                        type: 'module',
                    }],
                });
            }

            if (context.path.startsWith('/__storybook_ui__/')) {
                const moduleName = /** @type {'react' | 'react-dom' | '@storybook/components' | '@storybook/channels' | '@storybook/core-events' | '@storybook/router' | '@storybook/theming' | '@storybook/api' | '@storybook/addons' | '@storybook/client-logger'} */ (context.path.split('?')[0].replace('/__storybook_ui__/', ''));
                if (moduleName in definitions) {
                    const definition = definitions[moduleName];
                    return `import global from 'global';
import '@storybook/ui/dist/runtime';

const _default = global['${definition.varName}'];

export const { ${definition.namedExports.join(', ')} } = _default;
export default _default;
`;
                }
            }

            if (context.path.startsWith(`/${MANAGER_SCRIPT}`)) {
                return createManagerScript({
                    managerEntries,
                });
            }

            if (context.path.startsWith(`/${MANAGER_STYLE}`)) {
                return managerCss();
            }

            if (context.path.startsWith(`/${PREVIEW_MODULE_SCRIPT}`)) {
                return createPreviewModule();
            }

            if (context.path.startsWith(`/${PREVIEW_SCRIPT}`)) {
                const generator = await generatorPromise;
                const index = await generator.getIndex();

                return createPreviewScript({
                    framework,
                    specifiers: Object.values(index.entries),
                    previewEntries: [
                        ...previewEntries,
                    ],
                });
            }

            if (context.path.startsWith(`/${PREVIEW_STYLE}`)) {
                return previewCss();
            }

            const filePath = decodeURIComponent(getRequestFilePath(context.url, rootDir));
            const fileName = path.basename(filePath);

            if (context.path.endsWith('.mdx')) {
                return {
                    body: await transformMdxToCsf(await readFile(filePath, 'utf-8'), esbuild),
                };
            }

            if (fileName in staticFiles) {
                return await readFile(path.resolve(rootDir, staticFiles[fileName]), 'utf-8');
            }
        },
    };

    return plugin;
}
