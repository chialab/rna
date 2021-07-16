import { createTransform, ESM_KEYWORDS, CJS_KEYWORDS } from '@chialab/cjs-to-esm';
import { pipe } from '@chialab/estransform';
import { getEntry, finalizeEntry, createFilter } from '@chialab/esbuild-plugin-transform';

/**
 * @typedef {import('@chialab/cjs-to-esm').Options} PluginOptions
 */

/**
 * @param {string} code
 */
function matchCommonjs(code) {
    if (code.match(ESM_KEYWORDS) || !code.match(CJS_KEYWORDS)) {
        return false;
    }
    return true;
}

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

            build.onLoad({ filter: createFilter(build), namespace: 'file' }, (args) => {
                /**
                 * @type {import('@chialab/estransform').Pipeline}
                 */
                const entry = args.pluginData;
                if (entry && !matchCommonjs(entry.code)) {
                    return;
                }

                return getEntry(build, args.path)
                    .then(async (entry) => {
                        if (!matchCommonjs(entry.code)) {
                            return;
                        }

                        await pipe(entry, {
                            source: args.path,
                            sourcesContent: options.sourcesContent,
                        }, createTransform(config));

                        return finalizeEntry(build, args.path);
                    });
            });
        },
    };

    return plugin;
}
