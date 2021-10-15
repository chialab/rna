import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import esbuild from 'esbuild';
import { esbuildFile, dependencies, getRootDir } from '@chialab/esbuild-helpers';
import aliasPlugin, { addAlias } from '@chialab/esbuild-plugin-alias';
import transformPlugin, { addTransformationPlugin } from '@chialab/esbuild-plugin-transform';
import { indexHtml, iframeHtml, managerCss, previewCss } from './templates.js';
import { createManagerScript } from './createManager.js';
import { findStories } from './findStories.js';
import { createPreviewScript } from './createPreview.js';
import { mdxPlugin } from './mdxPlugin.js';
import { MANAGER_SCRIPT, MANAGER_STYLE, PREVIEW_SCRIPT, PREVIEW_STYLE } from './entrypoints.js';
import { createStoriesJson, createStorySpecifiers } from './createStoriesJson.js';

/**
 * @param {import('./createPlugins').StorybookConfig} config Storybook options.
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
            await dependencies(build, plugin, [aliasPlugin(), transformPlugin([])], 'before');
            await addTransformationPlugin(build, mdxPlugin(), 'start');

            const options = build.initialOptions;
            if (options.loader) {
                options.loader['.mdx'] = 'tsx';
            }

            const { outdir, outfile } = options;
            const rootDir = getRootDir(build);
            const outDir = outdir || (outfile && path.dirname(outfile)) || rootDir;
            const stories = await findStories(rootDir, storyPatterns);
            const loader = {
                ...options.loader,
            };
            delete loader['.html'];

            const plugins = [
                ...(options.plugins || [])
                    .filter((plugin) => !['storybook', 'html'].includes(plugin.name)),
            ];

            if (storybookBuild) {
                const { modules = {}, resolutions = [] } = storybookBuild;
                Object.entries(modules).forEach(([key, dest]) => addAlias(build, key, dest));
                resolutions.forEach((resolution) => addAlias(build, resolution, resolution, rootDir));
            }

            /**
             * @type {import('esbuild').BuildOptions}
             */
            const childOptions = {
                ...options,
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

                        const { result } = await esbuildFile(input, options);
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
