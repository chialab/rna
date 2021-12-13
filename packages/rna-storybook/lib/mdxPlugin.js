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
            const { onResolve, onLoad } = useRna(build);
            /**
             * @type {import('esbuild').BuildOptions['loader']}
             */
            build.initialOptions.loader = {
                ...(build.initialOptions.loader || {}),
                '.mdx': 'tsx',
            };

            onResolve({ filter: /\.mdx$/ }, (args) => ({
                path: args.path,
            }));

            onLoad({ filter: /\.mdx$/ }, async (args) => {
                try {
                    const code = await readFile(args.path, 'utf8');
                    const result = await transformMdxToCsf(code, args.path, build.esbuild);

                    return {
                        contents: result.code,
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
