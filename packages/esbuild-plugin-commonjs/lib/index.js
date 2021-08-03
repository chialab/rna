import { createTransform, maybeCommonjsModule } from '@chialab/cjs-to-esm';
import { pipe } from '@chialab/estransform';
import { getEntry, finalizeEntry, createFilter } from '@chialab/esbuild-plugin-transform';

/**
 * @typedef {import('@chialab/cjs-to-esm').Options} PluginOptions
 */

/**
 * @param {PluginOptions} [config]
 * @return An esbuild plugin.
 */
export default function(config = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'commonjs',
        setup(build) {
            const options = build.initialOptions;
            if (options.format !== 'esm') {
                return;
            }

            build.onLoad({ filter: createFilter(build), namespace: 'file' }, async (args) => {
                /**
                 * @type {import('@chialab/estransform').Pipeline}
                 */
                const entry = args.pluginData || await getEntry(build, args.path);
                if (!(await maybeCommonjsModule(entry.code))) {
                    return;
                }

                await pipe(entry, {
                    source: args.path,
                    sourcesContent: options.sourcesContent,
                }, createTransform(config));

                return finalizeEntry(build, args.path);
            });
        },
    };

    return plugin;
}
