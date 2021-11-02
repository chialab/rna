import { useRna } from '@chialab/esbuild-rna';
import { transformMdxToCsf } from './transformMdxToCsf.js';

export function mdxPlugin() {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'storybook-mdx',
        async setup(build) {
            const { onResolve, onTransform } = useRna(build);
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

            onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, (args) => {
                if (!args.path.match(/\.mdx$/)) {
                    return;
                }

                const code = args.code.toString();
                return transformMdxToCsf(code, {
                    source: args.path,
                });
            });
        },
    };

    return plugin;
}
