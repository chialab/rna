import path from 'path';
import { useRna } from '@chialab/esbuild-rna';

/**
 * @typedef {Object} PostcssConfig
 * @property {import('postcss').ProcessOptions} [options]
 * @property {import('postcss').Plugin[]} [plugins]
 */

/**
 * Load local postcss config.
 * @return {Promise<PostcssConfig>}
 */
async function loadPostcssConfig() {
    const { default: postcssrc } = await import('postcss-load-config');
    try {
        /**
         * @type {any}
         */
        const result = await postcssrc();
        return result;
    } catch {
        //
    }

    return {};
}

/**
 * @typedef {import('postcss').ProcessOptions & { plugins?: import('postcss').Plugin[] }} PluginOptions
 */

/**
 * Instantiate a plugin that runs postcss across css files.
 * @param {PluginOptions} options
 * @return An esbuild plugin.
 */
export default function(options = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'postcss',
        async setup(build) {
            const { onTransform, resolve, rootDir, collectDependencies } = useRna(build);

            onTransform({ filter: /\.(sc|sa|c)ss$/ }, async (args) => {
                const [
                    { default: postcss },
                    { default: preset },
                ] = await Promise.all([
                    import('postcss'),
                    import('@chialab/postcss-preset-chialab'),
                ]);

                const config = await loadPostcssConfig();
                const isSass = ['.sass', '.scss'].includes(path.extname(args.path));
                const plugins = [
                    ...(config.plugins || [preset()]),
                    ...(isSass ? [
                        await import('@chialab/postcss-dart-sass')
                            .then(({ default: postcssSass }) => postcssSass({
                                rootDir,
                                omitSourceMapUrl: true,
                                sourceMapContents: true,
                                sourceMapEmbed: false,
                                importer(path, importer, done) {
                                    resolve({
                                        kind: 'import-rule',
                                        path,
                                        importer,
                                        namespace: 'file',
                                        pluginData: null,
                                        resolveDir: rootDir,
                                    }).then((result) => {
                                        if (result.path) {
                                            done({
                                                file: result.path,
                                            });
                                        }
                                    });
                                },
                            })),
                    ] : []),
                    ...(options.plugins || []),
                ];

                /**
                 * @type {import('postcss').ProcessOptions}
                 */
                const finalConfig = {
                    from: args.path,
                    ...(config.options || {}),
                    ...options,
                    ...(isSass ? {
                        syntax: await import('postcss-scss').then(({ default: postcssSass }) => postcssSass),
                    } : {}),
                    map: {
                        inline: false,
                        sourcesContent: true,
                        annotation: false,
                    },
                };

                const code = args.code.toString();
                const result = await postcss(plugins).process(code, finalConfig);
                const sourceMap = result.map.toJSON();
                const cwd = process.cwd();
                const argsDir = path.dirname(args.path);
                sourceMap.sources = sourceMap.sources.map((source) => path.relative(argsDir, path.resolve(cwd, source)));
                delete sourceMap.file;
                const url = `data:application/json;base64,${Buffer.from(JSON.stringify(sourceMap)).toString('base64')}`;
                const dependencies = result.messages
                    .filter(({ type }) => type === 'dependency')
                    .map(({ file }) => file);

                collectDependencies(args.path, dependencies);

                return {
                    code: `${result.css.toString()}\n/*# sourceMappingURL=${url} */\n`,
                    loader: 'css',
                    watchFiles: dependencies,
                };
            });
        },
    };

    return plugin;
}
