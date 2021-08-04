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
export function servePlugin({ type, stories: storiesPattern, static: staticFiles = {}, essentials = false, addons = [], managerEntries = [], previewEntries = [], managerHead, previewHead, previewBody }) {
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

            if (context.path === '/__storybook-manager__.js' ||
                context.URL.searchParams.has('manager')) {
                return appendManagerParam(source);
            }

            if (context.path === '/__storybook-preview__.js' ||
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

            if (context.path === '/') {
                return indexHtml({
                    managerHead: managerHead || '',
                    css: {
                        path: '/__storybook-manager__.css',
                    },
                    js: {
                        path: '/__storybook-manager__.js',
                        type: 'module',
                    },
                });
            }

            if (context.path === '/iframe.html') {
                return iframeHtml({
                    previewHead: previewHead || '',
                    previewBody: previewBody || '',
                    css: {
                        path: '/__storybook-preview__.css',
                    },
                    js: {
                        path: '/__storybook-preview__.js',
                        type: 'module',
                    },
                });
            }

            if (context.path.startsWith('/__storybook-manager__.js')) {
                const [manager] = await addonsLoader;
                return createManagerScript({
                    addons: [
                        ...(essentials ? ['@storybook/essentials/register'] : []),
                        ...addons,
                    ],
                    managerEntries: [
                        ...manager,
                        ...managerEntries,
                    ],
                });
            }

            if (context.path.startsWith('/__storybook-manager__.css')) {
                return managerCss();
            }

            if (context.path.startsWith('/__storybook-preview__.js')) {
                const { rootDir } = serverConfig;
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
                        ...(essentials ? ['@storybook/essentials'] : []),
                        ...preview,
                    ],
                });
            }

            if (context.path.startsWith('/__storybook-preview__.css')) {
                return previewCss();
            }

            const { rootDir } = serverConfig;
            const filePath = decodeURIComponent(getRequestFilePath(context.url, rootDir));
            const fileName = path.basename(filePath);

            if (context.path.endsWith('.mdx')) {
                const body = await readFile(filePath, 'utf-8');
                context.body = await transformMdxToCsf(body, filePath);
            }

            if (fileName in staticFiles) {
                return await readFile(path.resolve(rootDir, staticFiles[fileName]), 'utf-8');
            }
        },
    };

    return plugin;
}
