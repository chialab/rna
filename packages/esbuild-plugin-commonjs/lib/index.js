import esbuildModule from 'esbuild';
import { transform, ESM_KEYWORDS, CJS_KEYWORDS } from '@chialab/cjs-to-esm';
import { getTransformOptions, transpileEntry } from '@chialab/esbuild-plugin-transform';

/**
 * @param {{ esbuild?: typeof esbuildModule }} plugins
 * @return An esbuild plugin.
 */
export default function({ esbuild = esbuildModule } = {}) {
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

                const { code, map, loader } = await transpileEntry(entry, esbuild, options);
                const result = transform(code, {
                    source: args.path,
                });

                return buildEntry(args.path, {
                    code: result.code,
                    map: /** @type {import('@chialab/esbuild-plugin-transform').SourceMap[]} */ ([
                        map,
                        result.map,
                    ].filter(Boolean)),
                    loader,
                });
            });
        },
    };

    return plugin;
}
