import path from 'path';
import esbuild from 'esbuild';
import { esbuildFile, dependencies } from '@chialab/esbuild-helpers';
import transformPlugin, { addTransformationPlugin } from '@chialab/esbuild-plugin-transform';
import { indexHtml, iframeHtml, managerCss, previewCss } from '@chialab/storybook-prebuilt';
import { createManagerScript } from './createManager.js';
import { findStories } from './findStories.js';
import { createPreviewScript } from './createPreview.js';
import { loadAddons } from './loadAddons.js';
import { mdxPlugin } from './mdxPlugin.js';
import { aliasPlugin } from './aliasPlugin.js';

/**
 * @param {import('./createPlugins').StorybookConfig} config Storybook options.
 * @return An esbuild plugin.
 */
export function buildPlugin(config) {
    const { type, stories: storiesPattern = [], static: staticFiles = {}, essentials = false, addons = [], managerEntries = [], previewEntries = [], managerHead, previewHead, previewBody } = config;

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'storybook',
        async setup(build) {
            await dependencies(build, plugin, [transformPlugin([])], 'before');
            await addTransformationPlugin(build, mdxPlugin(), 'start');

            const options = build.initialOptions;
            if (options.loader) {
                options.loader['.mdx'] = 'tsx';
            }

            const { sourceRoot, absWorkingDir, outdir, outfile } = options;
            const rootDir = sourceRoot || absWorkingDir || process.cwd();
            const outDir = outdir || (outfile && path.dirname(outfile)) || rootDir;
            const stories = await findStories(rootDir, storiesPattern);
            const loader = {
                ...options.loader,
            };
            delete loader['.html'];
            const addonsLoader = loadAddons(addons, rootDir);

            const plugins = [
                aliasPlugin(config),
                ...(options.plugins || []).filter((plugin) => !['storybook', 'html'].includes(plugin.name)),
            ];

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
                            sourcefile: '__storybook-manager__.css',
                            loader: 'css',
                        },
                    }),
                    esbuild.build({
                        ...childOptions,
                        stdin: {
                            contents: await previewCss(),
                            sourcefile: '__storybook-preview__.css',
                            loader: 'css',
                        },
                    }),
                    addonsLoader.then(([manager]) =>
                        esbuild.build({
                            ...childOptions,
                            stdin: {
                                contents: createManagerScript({
                                    addons: [
                                        ...(essentials ? ['@storybook/essentials/register'] : []),
                                        ...addons,
                                    ],
                                    managerEntries: [
                                        ...manager,
                                        ...managerEntries,
                                    ],
                                }),
                                sourcefile: path.join(rootDir, '__storybook-manager__.js'),
                                loader: 'tsx',
                            },
                        })
                    ),
                    addonsLoader.then(async ([, preview]) =>
                        esbuild.build({
                            ...childOptions,
                            stdin: {
                                contents: await createPreviewScript({
                                    type,
                                    stories,
                                    previewEntries: [
                                        ...previewEntries,
                                        ...(essentials ? ['@storybook/essentials'] : []),
                                        ...preview,
                                    ],
                                }),
                                sourcefile: path.join(rootDir, '__storybook-preview__.js'),
                                loader: 'tsx',
                            },
                        })
                    ),
                    esbuild.build({
                        ...childOptions,
                        stdin: {
                            contents: await indexHtml({
                                managerHead: managerHead || '',
                                css: {
                                    path: '__storybook-manager__.css',
                                },
                                js: {
                                    path: '__storybook-manager__.js',
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
                                    path: '__storybook-preview__.css',
                                },
                                js: {
                                    path: '__storybook-preview__.js',
                                    type: 'text/javascript',
                                },
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
