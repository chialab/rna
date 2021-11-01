import { REQUIRE_HELPER, HELPER_MODULE, transform, maybeCommonjsModule, maybeMixedModule, wrapDynamicRequire } from '@chialab/cjs-to-esm';
import { escapeRegexBody } from '@chialab/node-resolve';
import { createEmptySourcemapComment } from '@chialab/estransform';
import { useRna } from '@chialab/esbuild-rna';

/**
 * @typedef {import('@chialab/cjs-to-esm').TransformOptions} PluginOptions
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

            const { onResolve, onLoad, onTransform } = useRna(build);

            if (config.helperModule) {
                const HELPER_FILTER = new RegExp(escapeRegexBody(`./${HELPER_MODULE}`));
                onResolve({ filter: HELPER_FILTER }, (args) => ({
                    path: args.path,
                    namespace: 'commonjs-helper',
                }));

                onLoad({ filter: HELPER_FILTER, namespace: 'commonjs-helper' }, async () => ({
                    contents: `export default ${REQUIRE_HELPER};\n${createEmptySourcemapComment()}`,
                }));
            }

            onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, async (args) => {
                const { code } = args;

                if (await maybeMixedModule(code)) {
                    return wrapDynamicRequire(code, {
                        source: args.path,
                        sourcesContent,
                    });
                }

                if (await maybeCommonjsModule(code)) {
                    return transform(code, {
                        source: args.path,
                        sourcesContent,
                    });
                }
            });
        },
    };

    return plugin;
}
