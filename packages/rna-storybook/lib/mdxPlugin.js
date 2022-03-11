import { readFile } from 'fs/promises';
import { useRna } from '@chialab/esbuild-rna';
import { transformMdxToCsf } from './transformMdxToCsf.js';

export function mdxPlugin() {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'storybook-mdx',
        async setup(build) {
            const { onLoad } = useRna(build);
            /**
             * @type {import('esbuild').BuildOptions['loader']}
             */
            build.initialOptions.loader = {
                ...(build.initialOptions.loader || {}),
                '.mdx': 'tsx',
            };

            build.onResolve({ filter: /\.mdx$/ }, (args) => ({
                path: args.path,
            }));

            onLoad({ filter: /\.mdx$/ }, async (args) => {
                try {
                    return {
                        contents: await transformMdxToCsf(await readFile(args.path, 'utf8'), build.esbuild),
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
