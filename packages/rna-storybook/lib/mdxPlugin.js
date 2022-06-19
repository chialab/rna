import { readFile } from 'fs/promises';
import { useRna } from '@chialab/esbuild-rna';
import { transformMdxToCsf } from './transformMdxToCsf.js';

export function mdxPlugin() {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'storybook-mdx',
        async setup(pluginBuild) {
            const build = useRna(pluginBuild);
            build.setLoader('.mdx', 'tsx');

            build.onResolve({ filter: /\.mdx$/ }, (args) => ({
                path: args.path,
            }));

            build.onLoad({ filter: /\.mdx$/ }, async (args) => {
                try {
                    return {
                        contents: await transformMdxToCsf(await readFile(args.path, 'utf8'), build.getBuilder()),
                        loader: 'js',
                    };
                } catch (err) {
                    return;
                }
            });
        },
    };

    return plugin;
}
