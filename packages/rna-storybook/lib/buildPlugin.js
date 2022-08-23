import path from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { useRna } from '@chialab/esbuild-rna';
import { createVirtualPlugin } from '@chialab/esbuild-plugin-virtual';
import htmlPlugin from '@chialab/esbuild-plugin-html';
import { escapeRegexBody } from '@chialab/node-resolve';
import { definitions } from '@storybook/ui/dist/globals';
import { indexHtml, iframeHtml, managerCss, previewCss } from './templates.js';
import { createManagerScript } from './createManager.js';
import { createPreviewModule, createPreviewScript } from './createPreview.js';
import { mdxPlugin } from './mdxPlugin.js';
import { MANAGER_SCRIPT, MANAGER_STYLE, PREVIEW_MODULE_SCRIPT, PREVIEW_SCRIPT, PREVIEW_STYLE } from './entrypoints.js';
import { createStoryIndexGenerator } from './createStoryIndexGenerator.js';

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
 * @returns An esbuild plugin.
 */
export function buildPlugin(config) {
    const {
        framework,
        stories: storiesPatterns = [],
        static: staticFiles = {},
        managerEntries = [],
        previewEntries = [],
        managerHead,
        previewHead,
        previewBody,
    } = config;

    /**
     * @type {import('esbuild').Plugin}
     */
    let virtualPlugin;

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'storybook',
        async setup(pluginBuild) {
            const build = useRna(plugin, pluginBuild);
            if (build.getOption('chunkNames') === '[name]') {
                build.setOption('chunkNames', '[name]-[hash]');
            }

            const rootDir = build.getSourceRoot();
            const outDir = build.getOutDir() || rootDir;
            const generator = await createStoryIndexGenerator(rootDir, storiesPatterns, {
                storySort: config.storySort,
            });
            const index = await generator.getIndex();

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
                            type: 'module',
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
                            type: 'module',
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
                        managerEntries,
                    }),
                },
                {
                    path: PREVIEW_SCRIPT,
                    contents: await createPreviewScript({
                        framework,
                        specifiers: Object.values(index.entries),
                        previewEntries,
                    }),
                },
            ]);

            await build.setupPlugin([
                virtualPlugin,
                mdxPlugin(),
                htmlPlugin(),
            ], 'before');

            const entryPoints = build.getOption('entryPoints');
            if (Array.isArray(entryPoints) && entryPoints.includes(MANAGER_SCRIPT)) {
                const aliasFilter = new RegExp(`^(${Object.keys(definitions).map((defName) => escapeRegexBody(defName)).join('|')})$`);
                build.onResolve({ filter: aliasFilter }, (args) => ({
                    path: args.path,
                    namespace: 'storybookui',
                }));

                build.onLoad({ filter: aliasFilter, namespace: 'storybookui' }, (args) => {
                    const moduleName = /** @type {'react' | 'react-dom' | '@storybook/components' | '@storybook/channels' | '@storybook/core-events' | '@storybook/router' | '@storybook/theming' | '@storybook/api' | '@storybook/addons' | '@storybook/client-logger'} */ (args.path);
                    if (moduleName in definitions) {
                        const definition = definitions[moduleName];
                        return {
                            contents: `import global from 'global';
import '@storybook/ui/dist/runtime';

const _default = global['${definition.varName}'];

export const { ${definition.namedExports.join(', ')} } = _default;
export default _default;
`,
                            loader: 'js',
                        };
                    }
                });
            }

            if (!build.isChunk()) {
                build.onEnd(async () => {
                    await mkdir(outDir, { recursive: true });
                    await writeFile(path.join(outDir, 'index.json'), JSON.stringify(index));
                });
            }
        },
    };

    return plugin;
}
