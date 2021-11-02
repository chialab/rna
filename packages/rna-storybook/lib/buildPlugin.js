import path from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { resolve } from '@chialab/node-resolve';
import { useRna } from '@chialab/esbuild-rna';
import { createAliasPlugin } from '@chialab/esbuild-plugin-alias';
import { createVirtualPlugin } from '@chialab/esbuild-plugin-virtual';
import htmlPlugin from '@chialab/esbuild-plugin-html';
import { indexHtml, iframeHtml, managerCss, previewCss } from './templates.js';
import { createManagerScript } from './createManager.js';
import { findStories } from './findStories.js';
import { createPreviewModule, createPreviewScript } from './createPreview.js';
import { mdxPlugin } from './mdxPlugin.js';
import { MANAGER_SCRIPT, MANAGER_STYLE, PREVIEW_MODULE_SCRIPT, PREVIEW_SCRIPT, PREVIEW_STYLE } from './entrypoints.js';
import { createStoriesJson, createStorySpecifiers } from './createStoriesJson.js';

/**
 * Create the entrypoint for the Storybook build.
 * @param {string} [publicDir] The output directory.
 */
export function createEntrypoint(publicDir = 'public') {
    return {
        input: [
            'index.html',
            'iframe.html',
        ],
        output: publicDir,
    };
}

/**
 * @param {import('./index.js').StorybookConfig} config Storybook options.
 * @return An esbuild plugin.
 */
export function buildPlugin(config) {
    const {
        framework,
        stories: storyPatterns = [],
        static: staticFiles = {},
        managerEntries = [],
        previewEntries = [],
        managerHead,
        previewHead,
        previewBody,
        build: storybookBuild,
    } = config;

    /**
     * @type {import('esbuild').Plugin}
     */
    let aliasPlugin;

    /**
     * @type {import('esbuild').Plugin}
     */
    let virtualPlugin;

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'storybook',
        async setup(build) {
            const { rootDir, outDir: realOutDir, setupPlugin } = useRna(build);
            const stories = await findStories(rootDir, storyPatterns);
            const storyIndexEntries = await createStorySpecifiers(stories, rootDir);
            const outDir = realOutDir || rootDir;

            aliasPlugin = aliasPlugin || createAliasPlugin()({
                ...(storybookBuild && storybookBuild.modules || {}),
                ...((storybookBuild && storybookBuild.resolutions || []).reduce((acc, resolution) => ({
                    ...acc,
                    [resolution]: () => resolve(resolution, rootDir),
                }), {})),
            });

            virtualPlugin = virtualPlugin || createVirtualPlugin()([
                ...await Promise.all(
                    Object.keys(staticFiles).map(async (file) => ({
                        path: file,
                        contents: await readFile(staticFiles[file]),
                    }))
                ),
                {
                    path: 'index.html',
                    contents: await indexHtml({
                        managerHead: managerHead || '',
                        css: [{
                            path: MANAGER_STYLE,
                        }],
                        js: [{
                            path: MANAGER_SCRIPT,
                            type: 'text/javascript',
                        }],
                    }),
                },
                {
                    path: 'iframe.html',
                    contents: await iframeHtml({
                        previewHead: previewHead || '',
                        previewBody: previewBody || '',
                        css: [{
                            path: PREVIEW_STYLE,
                        }],
                        js: [{
                            path: PREVIEW_SCRIPT,
                            type: 'text/javascript',
                        }],
                    }),
                },
                {
                    path: PREVIEW_MODULE_SCRIPT,
                    contents: await createPreviewModule(),
                },
                {
                    path: MANAGER_STYLE,
                    contents: await managerCss(),
                },
                {
                    path: PREVIEW_STYLE,
                    contents: await previewCss(),
                },
                {
                    path: MANAGER_SCRIPT,
                    contents: createManagerScript({
                        manager: storybookBuild ? storybookBuild.manager : '@storybook/core-client/dist/esm/manager/index.js',
                        managerEntries,
                    }),
                },
                {
                    path: PREVIEW_SCRIPT,
                    contents: await createPreviewScript({
                        framework,
                        specifiers: Array.from(storyIndexEntries.keys()),
                        previewEntries,
                    }),
                },
            ]);

            await setupPlugin(plugin, [
                aliasPlugin,
                virtualPlugin,
                mdxPlugin(),
                htmlPlugin(),
            ], 'before');

            build.onEnd(async () => {
                await mkdir(outDir, { recursive: true });
                await writeFile(path.join(outDir, 'stories.json'), JSON.stringify(
                    await createStoriesJson(stories, rootDir, {
                        storySort: config.storySort,
                    })
                ));
            });
        },
    };

    return plugin;
}
