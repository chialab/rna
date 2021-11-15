import { REQUIRE_HELPER, HELPER_MODULE, createTransform, maybeCommonjsModule, maybeMixedModule, wrapDynamicRequire } from '@chialab/cjs-to-esm';
import { escapeRegexBody } from '@chialab/node-resolve';
import { createEmptySourcemapComment, pipe } from '@chialab/estransform';
import { getEntry, finalizeEntry, createFilter, transformError } from '@chialab/esbuild-plugin-transform';

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
            const { sourcesContent, format } = build.initialOptions;
            if (format !== 'esm') {
                return;
            }

            if (config.helperModule) {
                const HELPER_FILTER = new RegExp(escapeRegexBody(`./${HELPER_MODULE}`));
                build.onResolve({ filter: HELPER_FILTER }, (args) => ({
                    path: args.path,
                    namespace: 'commonjs-helper',
                }));

                build.onLoad({ filter: HELPER_FILTER, namespace: 'commonjs-helper' }, async () => ({
                    contents: `export default ${REQUIRE_HELPER};\n${createEmptySourcemapComment()}`,
                }));
            }

            build.onLoad({ filter: createFilter(build), namespace: 'file' }, async (args) => {
                /**
                 * @type {import('@chialab/estransform').Pipeline}
                 */
                const entry = args.pluginData || await getEntry(build, args.path);

                if (await maybeMixedModule(entry.code)) {
                    try {
                        await pipe(entry, {
                            source: args.path,
                            sourcesContent,
                        }, wrapDynamicRequire);

                    } catch (error) {
                        throw transformError(this.name, error);
                    }

                    return finalizeEntry(build, entry, { source: args.path });
                }

                if (await maybeCommonjsModule(entry.code)) {
                    try {
                        await pipe(entry, {
                            source: args.path,
                            sourcesContent,
                        }, createTransform(config));
                    } catch (error) {
                        throw transformError(this.name, error);
                    }

                    return finalizeEntry(build, entry, { source: args.path });
                }
            });
        },
    };

    return plugin;
}
