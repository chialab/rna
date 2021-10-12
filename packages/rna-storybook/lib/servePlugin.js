import path from 'path';
import { readFile } from 'fs/promises';
import { getRequestFilePath } from '@web/dev-server-core';
import { browserResolve, isCss, isJson, isUrl, appendSearchParam } from '@chialab/node-resolve';
import { resolveImport } from '@chialab/wds-plugin-node-resolve';
import { appendCssModuleParam, appendJsonModuleParam } from '@chialab/wds-plugin-rna';
import { indexHtml, iframeHtml, managerCss, previewCss } from './templates.js';
import { loadAddons } from './loadAddons.js';
import { findStories } from './findStories.js';
import { createManagerScript } from './createManager.js';
import { createPreviewScript } from './createPreview.js';
import { transformMdxToCsf } from './transformMdxToCsf.js';
import { createStoriesJson } from './createStoriesJson.js';
import { MANAGER_SCRIPT, MANAGER_STYLE, PREVIEW_SCRIPT, PREVIEW_STYLE, DESIGN_TOKENS_SCRIPT } from './entrypoints.js';

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
 * @param {import('./createPlugins').StorybookConfig} config
 */
export function servePlugin(config) {
    const {
        type,
        stories: storiesPattern,
        static: staticFiles = {},
        addons = [],
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
     * @type {Promise<[string[], string[]]>}
     */
    let addonsLoader;

    /**
     * @type {Plugin}
     */
    const plugin = {
        name: 'rna-storybook',

        async serverStart(args) {
            serverConfig = args.config;
            addonsLoader = loadAddons(addons, serverConfig.rootDir);
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
                context.path === `/${DESIGN_TOKENS_SCRIPT}` ||
                context.URL.searchParams.has('preview') ||
                context.URL.searchParams.has('story')) {
                return appendPreviewParam(source);
            }
        },

        async resolveImport({ source, context, code, line, column }) {
            const { rootDir } = serverConfig;
            const filePath = getRequestFilePath(context.url, rootDir);

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
                const { modules = [], resolutions = [], map = {} } = build;

                if (modules.includes(source)) {
                    const url = await browserResolve(map[source], filePath);
                    return await resolveImport(url, filePath, rootDir);
                }

                if (resolutions.includes(source)) {
                    const url = await browserResolve(source, filePath);
                    return await resolveImport(url, filePath, rootDir, { code, line, column });
                }
            }

            if (source === `/${DESIGN_TOKENS_SCRIPT}`) {
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
                    body: JSON.stringify(await createStoriesJson(stories)),
                };
            }

            if (context.path === '/iframe.html') {
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
                });
            }

            if (context.path.startsWith(`/${MANAGER_SCRIPT}`)) {
                const [manager] = await addonsLoader;
                return createManagerScript({
                    manager: build ? build.manager : '@storybook/core-client/dist/esm/manager/index.js',
                    addons: manager,
                    managerEntries,
                });
            }

            if (context.path.startsWith(`/${MANAGER_STYLE}`)) {
                return managerCss();
            }

            if (context.path.startsWith(`/${PREVIEW_SCRIPT}`)) {
                const [, preview] = await addonsLoader;
                const stories = await findStories(rootDir, storiesPattern);
                return createPreviewScript({
                    type,
                    stories: stories
                        .map((storyFilePath) => `./${path.relative(
                            serverConfig.rootDir,
                            storyFilePath
                        ).split(path.sep).join('/')}`)
                        .map(i => `${i}?story=true`),
                    previewEntries: [
                        ...previewEntries,
                        ...preview,
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
