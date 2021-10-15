import path from 'path';
import { transformMdxToCsf } from './transformMdxToCsf.js';
import { pipe } from '@chialab/estransform';
import { getEntry, finalizeEntry, createFilter } from '@chialab/esbuild-plugin-transform';

export function mdxPlugin() {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'storybook-mdx',
        async setup(build) {
            const { sourcesContent } = build.initialOptions;

            build.onResolve({ filter: /\.mdx$/ }, (args) => ({
                path: args.path,
            }));

            build.onLoad({ filter: createFilter(build), namespace: 'file' }, async (args) => {
                if (!args.path.endsWith('.mdx')) {
                    return;
                }

                /**
                 * @type {import('@chialab/estransform').Pipeline}
                 */
                const entry = args.pluginData || await getEntry(build, args.path);

                await pipe(entry, {
                    source: path.basename(args.path),
                    sourcesContent,
                }, async ({ code }) =>
                    transformMdxToCsf(code, args.path)
                );

                return finalizeEntry(build, args.path);
            });
        },
    };

    return plugin;
}
