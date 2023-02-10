import path from 'path';
import { HELPER_MODULE, transform, maybeCommonjsModule, maybeMixedModule, wrapDynamicRequire, createRequireHelperModule } from '@chialab/cjs-to-esm';
import { useRna } from '@chialab/esbuild-rna';

/**
 * @typedef {import('@chialab/cjs-to-esm').TransformOptions} PluginOptions
 */

/**
 * @param {PluginOptions} options
 * @returns An esbuild plugin.
 */
export default function({ helperModule } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'commonjs',
        setup(pluginBuild) {
            const build = useRna(plugin, pluginBuild);
            const { sourcesContent, format, sourcemap } = build.getOptions();
            if (format !== 'esm') {
                return;
            }

            const workingDir = build.getWorkingDir();

            if (helperModule) {
                const HELPER_FILTER = new RegExp(`./${HELPER_MODULE}`);
                build.onResolve({ filter: HELPER_FILTER }, (args) => ({
                    path: args.path,
                    namespace: 'commonjs-helper',
                }));

                build.onLoad({ filter: HELPER_FILTER, namespace: 'commonjs-helper' }, async () => ({
                    contents: createRequireHelperModule(),
                    loader: 'js',
                }));
            }

            build.onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, async (args) => {
                const code = args.code;

                if (await maybeMixedModule(code)) {
                    return wrapDynamicRequire(code, {
                        sourcemap: !!sourcemap,
                        source: path.relative(workingDir, args.path),
                        sourcesContent,
                    });
                }

                if (await maybeCommonjsModule(code)) {
                    return transform(code, {
                        sourcemap: !!sourcemap,
                        source: path.relative(workingDir, args.path),
                        sourcesContent,
                        helperModule,
                    });
                }
            });
        },
    };

    return plugin;
}
