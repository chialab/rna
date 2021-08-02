import path from 'path';
import { readFile } from 'fs/promises';
import esbuild from 'esbuild';
import { resolveToImportMetaUrl } from '@chialab/node-resolve';
import { createManagerHtml, createManagerScript, createManagerStyle } from './createManager.js';
import { findStories } from './findStories.js';
import { createPreviewHtml, createPreviewScript, createPreviewStyle } from './createPreview.js';
import { transformMdxToCsf } from './transformMdxToCsf.js';

/**
 * @param {string} type
 */
function storybookModulesPlugin(type) {
    const storybookDir = resolveToImportMetaUrl(import.meta.url, '../storybook');

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'storybook-modules',
        async setup(build) {
            build.onResolve({ filter: /^@storybook\/manager$/ }, () => ({
                path: path.resolve(storybookDir, 'manager/index.js'),
            }));

            build.onResolve({ filter: new RegExp(`^@storybook\\/${type}$`) }, () => ({
                path: path.resolve(storybookDir, `${type}/index.js`),
            }));

            build.onResolve({ filter: /^@storybook\/addon-docs$/ }, () => ({
                path: path.resolve(storybookDir, `${type}/index.js`),
            }));

            if (type === 'web-components') {
                build.onResolve({ filter: /^lit-html$/ }, () => ({
                    path: path.resolve(storybookDir, `${type}/index.js`),
                }));
            }

            build.onResolve({ filter: /\.mdx$/ }, (args) => ({
                path: args.path,
            }));

            build.onLoad({ filter: /\.mdx$/ }, async (args) => ({
                contents: await transformMdxToCsf(type, await readFile(args.path, 'utf-8'), args.path),
                loader: 'js',
            }));
        },
    };

    return plugin;
}

/**
 * @param {import('./createPlugin').StorybookConfig} options Storybook options.
 * @return An esbuild plugin.
 */
export function buildPlugin({ type, stories: storiesPattern, addons, managerHead, previewHead, previewBody }) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'storybook',
        async setup(build) {
            const options = build.initialOptions;
            const rootDir = options.sourceRoot || process.cwd();
            const stories = await findStories(rootDir, storiesPattern);
            const loader = {
                ...options.loader,
            };
            delete loader['.html'];

            const plugins = [
                storybookModulesPlugin(type),
                ...(options.plugins || []).filter((plugin) => plugin.name !== 'storybook' && plugin.name !== 'html'),
            ];

            /**
             * @type {import('esbuild').BuildResult[]}
             */
            let results = [];

            /**
             * @type {import('esbuild').BuildOptions}
             */
            const childOptions = {
                ...options,
                plugins,
                loader,
                format: 'iife',
                splitting: false,
                bundle: true,
                logLevel: 'error',
            };

            build.onStart(async () => {
                results = await Promise.all([
                    esbuild.build({
                        ...childOptions,
                        stdin: {
                            contents: createManagerStyle(),
                            sourcefile: 'manager.css',
                            loader: 'css',
                        },
                    }),
                    esbuild.build({
                        ...childOptions,
                        stdin: {
                            contents: createPreviewStyle(),
                            sourcefile: 'preview.css',
                            loader: 'css',
                        },
                    }),
                    esbuild.build({
                        ...childOptions,
                        stdin: {
                            contents: createManagerScript({
                                addons,
                            }),
                            sourcefile: path.join(rootDir, 'manager.js'),
                            loader: 'tsx',
                        },
                    }),
                    esbuild.build({
                        ...childOptions,
                        stdin: {
                            contents: await createPreviewScript({
                                type,
                                stories,
                            }),
                            sourcefile: path.join(rootDir, 'preview.js'),
                            loader: 'tsx',
                        },
                    }),
                    esbuild.build({
                        ...childOptions,
                        stdin: {
                            contents: createManagerHtml({
                                managerHead,
                            }),
                            sourcefile: path.join(rootDir, 'index.html'),
                            loader: 'file',
                        },
                    }),
                    esbuild.build({
                        ...childOptions,
                        stdin: {
                            contents: await createPreviewHtml({
                                previewHead,
                                previewBody,
                            }),
                            sourcefile: path.join(rootDir, 'iframe.html'),
                            loader: 'file',
                        },
                    }),
                ]);
            });


            build.onEnd(async (result) => {
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
