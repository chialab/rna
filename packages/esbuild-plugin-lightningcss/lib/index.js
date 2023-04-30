import path from 'path';
import { useRna } from '@chialab/esbuild-rna';
import cssImport from '@chialab/esbuild-plugin-css-import';

const DEFAULT_TARGETS = [
    'chrome 63',
    'and_chr 63',
    'firefox 67',
    'edge 79',
    'opera 50',
    'safari 11.1',
    'ios_saf 11.3',
];

/**
 * @typedef {Partial<import('lightningcss').TransformOptions>} PluginOptions
 */

/**
 * Instantiate a plugin that runs postcss across css files.
 * @param {PluginOptions} options
 * @returns An esbuild plugin.
 */
export default function(options = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'lightningcss',
        async setup(pluginBuild) {
            const build = useRna(plugin, pluginBuild);
            const { absWorkingDir, target } = build.getOptions();
            build.setupPlugin([cssImport()], 'before');

            const targets = (target ? (Array.isArray(target) ? target : [target]) : [])
                .filter((target) => target !== 'esnext' && !target.match(/^es\d/))
                .map((target) => target.replace(/(\d+)/, ' $1'));

            build.onTransform({ loaders: ['css'], extensions: ['.css'] }, async (args) => {
                const { transform, browserslistToTargets } = await import('lightningcss');

                /**
                 * @type {import('lightningcss').TransformOptions}
                 */
                const finalConfig = {
                    errorRecovery: true,
                    targets: browserslistToTargets(targets.length ? targets : DEFAULT_TARGETS),
                    ...options,
                    filename: args.path,
                    code: Buffer.from(args.code),
                    sourceMap: true,
                    // analyzeDependencies: {
                    //     preserveImports: true,
                    // },
                };

                const result = transform(finalConfig);

                /**
                 * @type {import('source-map').RawSourceMap}
                 */
                const sourceMap = result.map && JSON.parse(result.map.toString());
                if (sourceMap) {
                    const cwd = absWorkingDir || process.cwd();
                    const argsDir = path.dirname(args.path);
                    sourceMap.sources = sourceMap.sources.map((source) => path.relative(argsDir, path.resolve(cwd, source)));
                    sourceMap.file = '';
                }
                const sourceMapUrl = sourceMap && `data:application/json;base64,${Buffer.from(JSON.stringify(sourceMap)).toString('base64')}`;
                const dependencies = (result.dependencies || [])
                    .filter(({ type }) => type === 'import')
                    .map(({ url }) => url);

                build.collectDependencies(args.path, dependencies);

                return {
                    code: `${result.code.toString()}\n/*# sourceMappingURL=${sourceMapUrl} */\n`,
                    loader: 'css',
                    watchFiles: dependencies,
                };
            });
        },
    };

    return plugin;
}
