import path from 'path';
import { readFile } from 'fs/promises';
import { getRequestFilePath } from '@web/dev-server-core';
import { browserResolve, isCss, isJson, isUrl, appendSearchParam } from '@chialab/node-resolve';
import { resolveImport } from '@chialab/wds-plugin-node-resolve';
import { indexHtml, iframeHtml, managerCss, previewCss } from '@chialab/storybook-prebuilt';
import { appendCssModuleParam, appendJsonModuleParam } from '@chialab/wds-plugin-rna';
import { loadAddons } from './loadAddons.js';
import { findStories } from './findStories.js';
import { createManagerScript } from './createManager.js';
import { createPreviewScript } from './createPreview.js';
import { transformMdxToCsf } from './transformMdxToCsf.js';
import { createBundleMap } from './bundleMap.js';
import { MANAGER_SCRIPT, MANAGER_STYLE, PREVIEW_SCRIPT, PREVIEW_STYLE, DESIGN_TOKENS_SCRIPT } from './entrypoints.js';
import { createDesignTokens } from './createDesignTokens.js';

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
 * @param {import('./createPlugins').StorybookConfig} options
 */
export function servePlugin({ type, stories: storiesPattern, static: staticFiles = {}, essentials = false, designTokens = false, addons = [], managerEntries = [], previewEntries = [], cssFiles = [], managerHead, previewHead, previewBody }) {
    /**
     * @type {import('@web/dev-server-core').DevServerCoreConfig}
     */
    let serverConfig;

    /**
     * @type {Promise<[string[], string[]]>}
     */
    let addonsLoader;

    const { map, modules, resolutions } = createBundleMap(type);

    /**
     * @type {Plugin}
     */
    const plugin = {
        name: 'rna-storybook',

        serverStart(args) {
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

            if (source.includes('/@storybook/') ||
                (context.path.includes('/@storybook/') && source[0] === './')) {
                source = source.replace('/dist/esm/', '/dist/cjs/');
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

            if (modules.includes(source)) {
                const url = await browserResolve(map[source], import.meta.url);
                return await resolveImport(url, filePath, rootDir);
            }

            if (resolutions.includes(source)) {
                const url = await browserResolve(source, rootDir);
                return await resolveImport(url, filePath, rootDir, { code, line, column });
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
                return {
                    body: JSON.stringify({
                        v: 2,
                        globalParameters: {},
                        kindParameters: {},
                        stories: {},
                    }),
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
                    addons: [
                        ...(essentials ? ['@storybook/addon-essentials/register'] : []),
                        ...(designTokens ? ['storybook-design-token/register'] : []),
                        ...addons,
                    ],
                    managerEntries: [
                        ...manager,
                        ...managerEntries,
                    ],
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
                        ...(essentials ? ['@storybook/addon-essentials'] : []),
                        ...(designTokens ? [`/${DESIGN_TOKENS_SCRIPT}`] : []),
                        ...preview,
                    ],
                });
            }

            if (context.path.startsWith(`/${PREVIEW_STYLE}`)) {
                return previewCss();
            }

            if (context.path.startsWith(`/${DESIGN_TOKENS_SCRIPT}`)) {
                return createDesignTokens(rootDir, cssFiles);
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
