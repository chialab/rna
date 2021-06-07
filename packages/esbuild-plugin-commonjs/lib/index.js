import path from 'path';
import esbuildModule from 'esbuild';
import { transform, ESM_KEYWORDS, CJS_KEYWORDS } from '@chialab/cjs-to-esm';
import { TARGETS, getTransformOptions } from '@chialab/esbuild-plugin-transform';

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

            const loaders = options.loader || {};
            const { filter, getEntry, buildEntry } = getTransformOptions(build);

            build.onLoad({ filter, namespace: 'file' }, async (args) => {
                const entry = await getEntry(args.path);

                if (entry.code.match(ESM_KEYWORDS) || !entry.code.match(CJS_KEYWORDS)) {
                    return;
                }

                if (entry.target === TARGETS.typescript) {
                    const { code, map } = await esbuild.transform(entry.code, {
                        sourcefile: args.path,
                        sourcemap: true,
                        loader: loaders[path.extname(args.path)] === 'ts' ? 'ts' : 'tsx',
                        format: 'cjs',
                        target: TARGETS.es2020,
                        jsxFactory: options.jsxFactory,
                        jsxFragment: options.jsxFragment,
                    });
                    entry.code = code;
                    entry.target = TARGETS.es2020;
                    entry.mappings.push(JSON.parse(map));
                }

                const { code, map } = transform(entry.code, {
                    source: args.path,
                });
                entry.code = code;
                entry.mappings.push(/** @type {SourceMap} */ (map));

                return buildEntry(args.path);
            });
        },
    };

    return plugin;
}
