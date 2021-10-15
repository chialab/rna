import path from 'path';
import { readFile } from 'fs/promises';
import { getRootDir, getStdinInput } from '@chialab/esbuild-helpers';
import { addBuildDependencies } from '@chialab/esbuild-plugin-dependencies';

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
 * @typedef {import('@chialab/postcss-url-rebase').UrlRebasePluginOptions} UrlRebasePluginOptions
 */

/**
 * @typedef {import('postcss').ProcessOptions & { relative?: UrlRebasePluginOptions['relative'], transform?: UrlRebasePluginOptions['transform'], alias?: import('@chialab/node-resolve').AliasMap }} PluginOptions
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
            const rootDir = getRootDir(build);
            const stdin = getStdinInput(build);

            build.onLoad({ filter: /\.(sc|sa|c)ss$/, namespace: 'file' }, async ({ path: filePath }) => {
                const [
                    { default: postcss },
                    { default: preset },
                    { default: urlRebase },
                ] = await Promise.all([
                    import('postcss'),
                    import('@chialab/postcss-preset-chialab'),
                    import('@chialab/postcss-url-rebase'),
                ]);

                const contents = (stdin && filePath === stdin.path) ?
                    stdin.contents :
                    await readFile(filePath, 'utf-8');

                const config = await loadPostcssConfig();
                const isSass = ['.sass', '.scss'].includes(path.extname(filePath));
                const plugins = [
                    urlRebase({
                        root: rootDir,
                        relative: options.relative,
                        transform: options.transform,
                    }),
                    ...(config.plugins || [preset()]),
                    ...(isSass ? [
                        await import('@chialab/postcss-dart-sass')
                            .then(({ default: postcssSass }) => postcssSass({
                                rootDir,
                                alias: options.alias,
                                omitSourceMapUrl: true,
                                sourceMapContents: true,
                                sourceMapEmbed: false,
                            })),
                    ] : []),
                ];


                /**
                 * @type {import('postcss').ProcessOptions}
                 */
                const finalConfig = {
                    from: filePath,
                    map: {
                        inline: false,
                        sourcesContent: true,
                    },
                    ...(config.options || {}),
                    ...options,
                    ...(isSass ? {
                        syntax: await import('postcss-scss').then(({ default: postcssSass }) => postcssSass),
                    } : {}),
                };

                const result = await postcss(plugins).process(contents, finalConfig);
                const sourceMap = result.map.toJSON();
                sourceMap.sources = [path.basename(filePath)];
                delete sourceMap.file;
                const url = `data:application/json;base64,${Buffer.from(JSON.stringify(sourceMap)).toString('base64')}`;
                const dependencies = result.messages
                    .filter(({ type }) => type === 'dependency')
                    .map(({ file }) => file);

                addBuildDependencies(build, filePath, dependencies);

                return {
                    contents: `${result.css.toString()}\n/*# sourceMappingURL=${url} */\n`,
                    loader: 'css',
                    watchFiles: dependencies,
                };
            });
        },
    };

    return plugin;
}
