import { ALIAS_MODE, createAliasRegex, browserResolve } from '@chialab/node-resolve';

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
                const filter = createAliasRegex(modName, ALIAS_MODE.FULL);
                build.onResolve({ filter }, async (args) => ({
                    path: await browserResolve(map[modName], args.importer),
                }));
            });

            resolutions.forEach((resolution) => {
                const filter = createAliasRegex(resolution, ALIAS_MODE.FULL);
                build.onResolve({ filter }, async (args) => ({
                    path: await browserResolve(resolution, args.importer),
                }));
            });
        },
    };

    return plugin;
}
