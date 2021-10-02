import { escapeRegexBody } from '@chialab/esbuild-helpers';
import { browserResolve } from '@chialab/node-resolve';

/**
 * @param {import('./createPlugins').StorybookBuild} config
 */
export function aliasPlugin({ map = {}, modules = [], resolutions = [] }) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'storybook-alias',
        async setup(build) {
            modules.forEach((modName) => {
                const filter = new RegExp(`^${escapeRegexBody(modName)}$`);
                build.onResolve({ filter }, async (args) => ({
                    path: await browserResolve(map[modName], args.importer),
                }));
            });

            resolutions.forEach((resolution) => {
                const filter = new RegExp(`^${escapeRegexBody(resolution)}$`);
                build.onResolve({ filter }, async (args) => ({
                    path: await browserResolve(resolution, args.importer),
                }));
            });
        },
    };

    return plugin;
}
