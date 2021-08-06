import { escapeRegexBody } from '@chialab/esbuild-helpers';
import { browserResolve } from '@chialab/node-resolve';
import { createBundleMap } from './bundleMap.js';

/**
 * @param {import('./createPlugins').StorybookConfig} options
 */
export function aliasPlugin({ type }) {
    const { map, modules, resolutions } = createBundleMap(type);

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'storybook-alias',
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
        },
    };

    return plugin;
}
