import { HELPER_MODULE, transform, maybeCommonjsModule, maybeMixedModule, wrapDynamicRequire, createRequireHelperModule } from '@chialab/cjs-to-esm';
import { escapeRegexBody } from '@chialab/node-resolve';
import { useRna } from '@chialab/esbuild-rna';

/**
 * @typedef {import('@chialab/cjs-to-esm').TransformOptions} PluginOptions
 */

/**
 * @param {PluginOptions} [config]
 * @return An esbuild plugin.
 */
export default function({ helperModule } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'commonjs',
        setup(build) {
            const { sourcesContent, format, sourcemap } = build.initialOptions;
            if (format !== 'esm') {
                return;
            }

            const { onResolve, onLoad, onTransform } = useRna(build);

            if (helperModule) {
                const HELPER_FILTER = new RegExp(escapeRegexBody(`./${HELPER_MODULE}`));
                onResolve({ filter: HELPER_FILTER }, (args) => ({
                    path: args.path,
                    namespace: 'commonjs-helper',
                }));

                onLoad({ filter: HELPER_FILTER, namespace: 'commonjs-helper' }, async () => ({
                    contents: createRequireHelperModule(),
                    loader: 'js',
                }));
            }

            onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, async (args) => {
                const code = args.code.toString();

                if (await maybeMixedModule(code)) {
                    return wrapDynamicRequire(code, {
                        sourcemap: !!sourcemap,
                        source: args.path,
                        sourcesContent,
                    });
                }

                if (await maybeCommonjsModule(code)) {
                    return transform(code, {
                        sourcemap: !!sourcemap,
                        source: args.path,
                        sourcesContent,
                        helperModule,
                    });
                }
            });
        },
    };

    return plugin;
}
