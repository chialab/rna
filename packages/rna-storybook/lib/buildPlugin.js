import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import esbuild from 'esbuild';
import { esbuildFile, setupPluginDependencies, getRootDir, getOutputDir } from '@chialab/esbuild-helpers';
import { resolve } from '@chialab/node-resolve';
import { createAliasPlugin } from '@chialab/esbuild-plugin-alias';
import transformPlugin, { addTransformationPlugin } from '@chialab/esbuild-plugin-transform';
import virtualPlugin from '@chialab/esbuild-plugin-virtual';
import { indexHtml, iframeHtml, managerCss, previewCss } from './templates.js';
import { createManagerScript } from './createManager.js';
import { findStories } from './findStories.js';
import { createPreviewModule, createPreviewScript } from './createPreview.js';
import { mdxPlugin } from './mdxPlugin.js';
import { MANAGER_SCRIPT, MANAGER_STYLE, PREVIEW_MODULE_SCRIPT, PREVIEW_SCRIPT, PREVIEW_STYLE } from './entrypoints.js';
import { createStoriesJson, createStorySpecifiers } from './createStoriesJson.js';

/**
 * @param {import('./index.js').StorybookConfig} config Storybook options.
 * @return An esbuild plugin.
 */
export function buildPlugin(config) {
    const {
        type,
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
    const plugin = {
        name: 'storybook',
        async setup(build) {
            const deps = [
                transformPlugin([]),
                virtualPlugin([{
                    path: `/${PREVIEW_MODULE_SCRIPT}`,
                    contents: await createPreviewModule(),
                }]),
            ];
            if (storybookBuild) {
                const { modules = {}, resolutions = [] } = storybookBuild;
                deps.unshift(createAliasPlugin()({
                    ...modules,
                    ...(resolutions.reduce((acc, resolution) => ({
                        ...acc,
                        [resolution]: () => resolve(resolution, rootDir),
                    }), {})),
                }));
            }
            await setupPluginDependencies(build, plugin, deps, 'before');
            await addTransformationPlugin(build, mdxPlugin(), 'start');

            const rootDir = getRootDir(build);
            const outDir = getOutputDir(build) || rootDir;
            const stories = await findStories(rootDir, storyPatterns);

            /**
             * @type {import('esbuild').BuildOptions['loader']}
             */
            const loader = {
                ...(build.initialOptions.loader || {}),
                '.mdx': 'tsx',
            };
            delete loader['.html'];

            const plugins = [
                ...(build.initialOptions.plugins || [])
                    .filter((plugin) => !['storybook', 'html'].includes(plugin.name)),
            ];

            /**
             * @type {import('esbuild').BuildOptions}
             */
            const childOptions = {
                ...build.initialOptions,
                plugins,
                loader,
                globalName: 'Storybook',
                target: 'es6',
                platform: 'browser',
                format: 'iife',
                splitting: false,
                bundle: true,
                logLevel: 'error',
            };

            const storyIndexEntries = await createStorySpecifiers(stories, rootDir);

            /**
             * @type {Promise<import('esbuild').BuildResult[]>}
             */
            let resultsPromise;

            build.onStart(async () => {
                resultsPromise = Promise.all([
                    esbuild.build({
                        ...childOptions,
                        stdin: {
                            contents: await managerCss(),
                            sourcefile: MANAGER_STYLE,
                            loader: 'css',
                        },
                    }),
                    esbuild.build({
                        ...childOptions,
                        stdin: {
                            contents: await previewCss(),
                            sourcefile: PREVIEW_STYLE,
                            loader: 'css',
                        },
                    }),
                    esbuild.build({
                        ...childOptions,
                        stdin: {
                            contents: createManagerScript({
                                manager: storybookBuild ? storybookBuild.manager : '@storybook/core-client/dist/esm/manager/index.js',
                                managerEntries,
                            }),
                            sourcefile: path.join(rootDir, MANAGER_SCRIPT),
                            loader: 'tsx',
                        },
                    }),
                    esbuild.build({
                        ...childOptions,
                        stdin: {
                            contents: await createPreviewScript({
                                type,
                                specifiers: Array.from(storyIndexEntries.keys()),
                                previewEntries,
                            }),
                            sourcefile: path.join(rootDir, PREVIEW_SCRIPT),
                            loader: 'tsx',
                        },
                    }),
                    esbuild.build({
                        ...childOptions,
                        stdin: {
                            contents: await indexHtml({
                                managerHead: managerHead || '',
                                css: {
                                    path: MANAGER_STYLE,
                                },
                                js: {
                                    path: MANAGER_SCRIPT,
                                    type: 'text/javascript',
                                },
                            }),
                            sourcefile: path.join(rootDir, 'index.html'),
                            loader: 'file',
                        },
                    }),
                    esbuild.build({
                        ...childOptions,
                        stdin: {
                            contents: await iframeHtml({
                                previewHead: previewHead || '',
                                previewBody: previewBody || '',
                                css: {
                                    path: PREVIEW_STYLE,
                                },
                                js: {
                                    path: PREVIEW_SCRIPT,
                                    type: 'text/javascript',
                                },
                                stories: JSON.stringify(
                                    Array.from(storyIndexEntries.keys()).map((specifier) => ({
                                        ...specifier,
                                        importPathMatcher: specifier.importPathMatcher.source,
                                    }))
                                ),
                            }),
                            sourcefile: path.join(rootDir, 'iframe.html'),
                            loader: 'file',
                        },
                    }),
                    ...Object.keys(staticFiles).map(async (outFile) => {
                        const input = path.resolve(rootDir, staticFiles[outFile]);
                        const output = path.join(outDir, outFile);
                        const extName = path.extname(input);
                        if (extName in loader) {
                            return esbuild.build({
                                ...childOptions,
                                entryPoints: [input],
                                outfile: output,
                                outdir: undefined,
                            });
                        }

                        const { result } = await esbuildFile(input, build.initialOptions);
                        return result;
                    }),
                ]);
            });

            build.onEnd(async (result) => {
                await mkdir(outDir, { recursive: true });
                await writeFile(path.join(outDir, 'stories.json'), JSON.stringify(
                    await createStoriesJson(stories, rootDir, {
                        storySort: config.storySort,
                    })
                ));

                const results = await resultsPromise;
                results.forEach((res) => {
                    result.errors.push(...res.errors);
                    result.warnings.push(...res.warnings);
                    if (result.metafile && res.metafile) {
                        result.metafile.inputs = {
                            ...result.metafile.inputs,
                            ...res.metafile.inputs,
                        };
                        result.metafile.outputs = {
                            ...result.metafile.outputs,
                            ...res.metafile.outputs,
                        };
                    }
                });
            });
        },
    };

    return plugin;
}
