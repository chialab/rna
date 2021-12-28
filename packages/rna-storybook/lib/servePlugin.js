import path from 'path';
import { readFile } from 'fs/promises';
import esbuild from 'esbuild';
import { isCss, isJson, isUrl, appendSearchParam } from '@chialab/node-resolve';
import { getRequestFilePath } from '@chialab/es-dev-server';
import { appendCssModuleParam, appendJsonModuleParam } from '@chialab/wds-plugin-rna';
import { indexHtml, iframeHtml, managerCss, previewCss } from './templates.js';
import { findStories } from './findStories.js';
import { createManagerScript } from './createManager.js';
import { createPreviewModule, createPreviewScript } from './createPreview.js';
import { transformMdxToCsf } from './transformMdxToCsf.js';
import { createStoriesJson, createStorySpecifiers } from './createStoriesJson.js';
import { MANAGER_SCRIPT, MANAGER_STYLE, PREVIEW_SCRIPT, PREVIEW_MODULE_SCRIPT, PREVIEW_STYLE } from './entrypoints.js';

const regexpReplaceWebsocket = /<!-- injected by web-dev-server -->(.|\s)*<\/script>/m;

/**
 * @param {string} source
 */
export function appendManagerParam(source) {
    return appendSearchParam(source, 'manager', 'true');
}

/**
 * @param {string} source
 */
export function appendPreviewParam(source) {
    return appendSearchParam(source, 'preview', 'true');
}

/**
 * @param {import('./index.js').StorybookConfig} config
 */
export function servePlugin(config) {
    const {
        framework,
        stories: storiesPattern,
        static: staticFiles = {},
        manager = '@storybook/core-client/dist/esm/manager/index.js',
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
     * @type {import('@chialab/es-dev-server').Plugin}
     */
    const plugin = {
        name: 'rna-storybook',

        async serverStart(args) {
            serverConfig = args.config;

            const { rootDir } = serverConfig;
            const fileWatcher = args.fileWatcher;

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

            if (context.path === `/${MANAGER_SCRIPT}` ||
                context.URL.searchParams.has('manager')) {
                return appendManagerParam(source);
            }

            if (context.path === `/${PREVIEW_SCRIPT}` ||
                context.URL.searchParams.has('preview') ||
                context.URL.searchParams.has('story')) {
                return appendPreviewParam(source);
            }
        },

        async resolveImport({ source }) {
            if (source === `/${PREVIEW_MODULE_SCRIPT}`) {
                return source;
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

            if (context.path === '/stories.json') {
                const stories = await findStories(rootDir, storiesPattern);
                return {
                    body: JSON.stringify(await createStoriesJson(stories, rootDir, {
                        storySort: config.storySort,
                    })),
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

            if (context.path.startsWith(`/${MANAGER_SCRIPT}`)) {
                return createManagerScript({
                    manager,
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
                const stories = await findStories(rootDir, storiesPattern);
                const storyIndexEntries = await createStorySpecifiers(stories, rootDir);

                return createPreviewScript({
                    framework,
                    specifiers: Array.from(storyIndexEntries.keys()),
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
                const body = await readFile(filePath, 'utf-8');
                const { code } = await transformMdxToCsf(body, filePath, esbuild);
                return {
                    body: code,
                };
            }

            if (fileName in staticFiles) {
                return await readFile(path.resolve(rootDir, staticFiles[fileName]), 'utf-8');
            }
        },
    };

    return plugin;
}
