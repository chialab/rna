import path from 'path';
import { useRna } from '@chialab/esbuild-rna';
import cssImport from '@chialab/esbuild-plugin-css-import';

/**
 * @typedef {Object} PostcssConfig
 * @property {import('postcss').ProcessOptions} [options]
 * @property {import('postcss').Plugin[]} [plugins]
 */

/**
 * Load local postcss config.
 * @param {string} [cwd]
 * @return {Promise<PostcssConfig>}
 */
async function loadPostcssConfig(cwd = process.cwd()) {
    const { default: postcssrc } = await import('postcss-load-config');
    try {
        /**
         * @type {any}
         */
        const result = await postcssrc({}, cwd);
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
            const { sourcemap = true, absWorkingDir } = build.initialOptions || {};
            const { onTransform, resolve, rootDir, collectDependencies, setupPlugin } = useRna(build);
            setupPlugin(plugin, [cssImport()], 'before');

            onTransform({ loaders: ['css'], extensions: ['.css', '.scss', '.sass'] }, async (args) => {
                const { default: postcss } = await import('postcss');

                const config = await loadPostcssConfig(rootDir);
                const isSass = ['.sass', '.scss'].includes(path.extname(args.path));
                const plugins = /** @type {import('postcss').Plugin[]} */ ([
                    ...(config.plugins || [
                        await import('@chialab/postcss-preset-chialab')
                            .then(({ default: preset }) => preset())
                            .catch(() => false),
                    ]),
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
                                        if (result.path && done) {
                                            done({
                                                file: result.path,
                                            });
                                        }
                                    }).catch((error) => {
                                        if (done) {
                                            done(error);
                                        }
                                    });
                                },
                            })),
                    ] : []),
                    ...(options.plugins || []),
                ].filter(Boolean));

                if (!plugins.length) {
                    return;
                }

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
                    map: sourcemap ? {
                        inline: false,
                        sourcesContent: true,
                        annotation: false,
                    } : false,
                };

                const code = args.code.toString();
                const result = await postcss(plugins).process(code, finalConfig);
                const sourceMap = result.map && result.map.toJSON();
                if (sourceMap) {
                    const cwd = absWorkingDir || process.cwd();
                    const argsDir = path.dirname(args.path);
                    sourceMap.sources = sourceMap.sources.map((source) => path.relative(argsDir, path.resolve(cwd, source)));
                    delete sourceMap.file;
                }
                const sourceMapUrl = sourceMap && `data:application/json;base64,${Buffer.from(JSON.stringify(sourceMap)).toString('base64')}`;
                const dependencies = result.messages
                    .filter(({ type }) => type === 'dependency')
                    .map(({ file }) => file);

                collectDependencies(args.path, dependencies);

                return {
                    code: sourceMap ? `${result.css.toString()}\n/*# sourceMappingURL=${sourceMapUrl} */\n` : result.css.toString(),
                    loader: 'css',
                    watchFiles: dependencies,
                };
            });
        },
    };

    return plugin;
}
