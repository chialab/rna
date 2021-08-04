import path from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';
import esbuild from 'esbuild';
import { escapeRegexBody } from '@chialab/estransform';
import { browserResolve } from '@chialab/node-resolve';
import { createManagerHtml, createManagerScript, createManagerStyle } from './createManager.js';
import { findStories } from './findStories.js';
import { createPreviewHtml, createPreviewScript, createPreviewStyle } from './createPreview.js';
import { transformMdxToCsf } from './transformMdxToCsf.js';
import { createBundleMap } from './bundleMap.js';
import { loadAddons } from './loadAddons.js';

/**
 * @param {import('./createPlugins').StorybookConfig} options
 */
function storybookModulesPlugin({ type }) {
    const { map, modules, resolutions } = createBundleMap(type);
    const MDX_FILTER_REGEX = /\.mdx$/;

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'storybook-modules',
        async setup(build) {
            const options = build.initialOptions;
            const { sourceRoot, absWorkingDir } = options;
            const rootDir = sourceRoot || absWorkingDir || process.cwd();

            modules.forEach((modName) => {
                const filter = new RegExp(`^${escapeRegexBody(modName)}$`);
                build.onResolve({ filter }, async () => ({
                    path: await browserResolve(map[modName], import.meta.url),
                }));
            });

            resolutions.forEach((resolution) => {
                const filter = new RegExp(`^${escapeRegexBody(resolution)}$`);
                build.onResolve({ filter }, async () => ({
                    path: await browserResolve(resolution, rootDir),
                }));
            });

            build.onResolve({ filter: MDX_FILTER_REGEX }, (args) => ({
                path: args.path,
            }));

            build.onLoad({ filter: MDX_FILTER_REGEX }, async (args) => ({
                contents: await transformMdxToCsf(await readFile(args.path, 'utf-8'), args.path),
                loader: 'js',
            }));
        },
    };

    return plugin;
}

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
            const options = build.initialOptions;
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
                storybookModulesPlugin(config),
                ...(options.plugins || []).filter((plugin) => !['storybook', 'html'].includes(plugin.name)),
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
                target: 'es6',
                platform: 'browser',
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
                            sourcefile: '__storybook-manager__.css',
                            loader: 'css',
                        },
                    }),
                    esbuild.build({
                        ...childOptions,
                        stdin: {
                            contents: createPreviewStyle(),
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
                            contents: createManagerHtml({
                                managerHead,
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
                            contents: await createPreviewHtml({
                                previewHead,
                                previewBody,
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

                        const buffer = await readFile(input);
                        await mkdir(outDir, { recursive: true });
                        await writeFile(output, buffer);

                        return {
                            errors: [],
                            warnings: [],
                            outputFiles: [{
                                path: output,
                                contents: buffer,
                                text: '',
                            }],
                            metafile: {
                                inputs: {
                                    [input]: {
                                        bytes: buffer.byteLength,
                                        imports: [],
                                    },
                                },
                                outputs: {
                                    [output]: {
                                        bytes: buffer.byteLength,
                                        inputs: {
                                            [input]: {
                                                bytesInOutput: buffer.byteLength,
                                            },
                                        },
                                        imports: [],
                                        exports: [],
                                        entryPoint: input,
                                    },
                                },
                            },
                        };
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
