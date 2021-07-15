import { createTransform, ESM_KEYWORDS, CJS_KEYWORDS } from '@chialab/cjs-to-esm';
import { pipe } from '@chialab/estransform';
import { getTransformOptions } from '@chialab/esbuild-plugin-transform';

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

            const { filter, getEntry, buildEntry } = getTransformOptions(build);

            build.onLoad({ filter, namespace: 'file' }, async (args) => {
                const entry = await getEntry(args.path);

                if (entry.code.match(ESM_KEYWORDS) || !entry.code.match(CJS_KEYWORDS)) {
                    return;
                }

                await pipe(entry, {
                    source: args.path,
                    sourcesContent: options.sourcesContent,
                }, createTransform(config));

                return buildEntry(args.path);
            });
        },
    };

    return plugin;
}
