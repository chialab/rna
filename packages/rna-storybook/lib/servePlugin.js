import path from 'path';
import { readFile } from 'fs/promises';
import { getRequestFilePath } from '@web/dev-server-core';
import { browserResolve, isCss, isJson, isUrl, appendSearchParam } from '@chialab/node-resolve';
import { resolveImport } from '@chialab/wds-plugin-node-resolve';
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
 * @typedef {import('@web/dev-server-core').Plugin} Plugin
 */

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
        managerEntries = [],
        previewEntries = [],
        managerHead,
        previewHead,
        previewBody,
        build,
    } = config;

    /**
     * @type {import('@web/dev-server-core').DevServerCoreConfig}
     */
    let serverConfig;

    /**
     * @type {Plugin}
     */
    const plugin = {
        name: 'rna-storybook',

        async serverStart(args) {
            serverConfig = args.config;
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

        async resolveImport({ source, context, code, line, column }) {
            const { rootDir } = serverConfig;
            const filePath = getRequestFilePath(context.url, rootDir);

            if (source === `/${PREVIEW_MODULE_SCRIPT}`) {
                return source;
            }

            if (!build) {
                if (source.includes('@storybook/') ||
                    (source.startsWith('.') && filePath.includes('/@storybook/'))
                ) {
                    const url = (await browserResolve(source, filePath))
                        .replace('/dist/esm/', '/dist/cjs/');
                    return await resolveImport(url, filePath, rootDir);
                }

                return;
            } else {
                const { modules = {}, resolutions = [] } = build;

                if (source in modules) {
                    const url = await browserResolve(modules[source], filePath);
                    return await resolveImport(url, filePath, rootDir);
                }

                if (resolutions.includes(source)) {
                    const url = await browserResolve(source, filePath);
                    return await resolveImport(url, filePath, rootDir, { code, line, column });
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
                    css: {
                        path: `/${MANAGER_STYLE}`,
                    },
                    js: {
                        path: `/${MANAGER_SCRIPT}`,
                        type: 'module',
                    },
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
                const stories = await findStories(rootDir, storiesPattern);
                const storyIndexEntries = await createStorySpecifiers(stories, rootDir);

                return iframeHtml({
                    previewHead: previewHead || '',
                    previewBody: previewBody || '',
                    css: {
                        path: `/${PREVIEW_STYLE}`,
                    },
                    js: {
                        path: `/${PREVIEW_SCRIPT}`,
                        type: 'module',
                    },
                    stories: JSON.stringify(
                        Array.from(storyIndexEntries.keys()).map((specifier) => ({
                            ...specifier,
                            importPathMatcher: specifier.importPathMatcher.source,
                        }))
                    ),
                });
            }

            if (context.path.startsWith(`/${MANAGER_SCRIPT}`)) {
                return createManagerScript({
                    manager: build ? build.manager : '@storybook/core-client/dist/esm/manager/index.js',
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
                const { code } = await transformMdxToCsf(body, filePath);
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
