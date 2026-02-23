import { Buffer } from 'node:buffer';
import path from 'node:path';
import process from 'node:process';
import { useRna } from '@chialab/esbuild-rna';
import postcssrc from 'postcss-load-config';

/**
 * @typedef {Object} PostcssConfig
 * @property {import('postcss').ProcessOptions} [options]
 * @property {import('postcss').Plugin[]} [plugins]
 */

/**
 * Load local postcss config.
 * @param {string} [cwd]
 * @returns {Promise<PostcssConfig>}
 */
async function loadPostcssConfig(cwd = process.cwd()) {
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
 * @returns An esbuild plugin.
 */
export default function (options = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'postcss',
        async setup(pluginBuild) {
            const build = useRna(plugin, pluginBuild);
            const { sourcemap = true, absWorkingDir, target } = build.getOptions();
            const config = await loadPostcssConfig(build.getSourceRoot());

            const cache = new Map();
            build.onStart(() => {
                cache.clear();
            });

            build.onEnd(() => {
                cache.clear();
            });

            build.onTransform({ loaders: ['css'], extensions: ['.css', '.scss', '.sass'] }, async (args) => {
                const isSass = ['.sass', '.scss'].includes(path.extname(args.path));

                /**
                 * @type {import('postcss').Plugin[]}
                 */
                const plugins = [...(config.plugins || [])];
                if (!plugins.length) {
                    const presetTargets = (Array.isArray(target) ? target : (target || '').split(','))
                        .filter((entry) => entry.trim())
                        .map((entry) => entry.toLowerCase())
                        .filter(
                            (entry) =>
                                entry.startsWith('chrome') ||
                                entry.startsWith('edge') ||
                                entry.startsWith('firefox') ||
                                entry.startsWith('ie') ||
                                entry.startsWith('ios') ||
                                entry.startsWith('opera') ||
                                entry.startsWith('safari')
                        )
                        // split browser name and version
                        .map((entry) => entry.replace(/([a-z]+)(.*)/, '$1 $2').split(' '))
                        // keep only major and minor version information
                        .map(([browser, version]) => `${browser} ${version.split('.').slice(0, 2).join('.')}`);

                    await import('postcss-preset-env')
                        .then(({ default: preset }) => {
                            plugins.push(
                                /** @type {import('postcss').Plugin} */ (
                                    preset({
                                        browsers: presetTargets.length ? presetTargets.join(',') : 'last 2 versions',
                                        preserve: true,
                                        autoprefixer: {
                                            grid: true,
                                            flexbox: true,
                                            remove: false,
                                        },
                                    })
                                )
                            );
                        })
                        .catch(() => false);
                }

                if (isSass) {
                    const sassPlugin = await import('@chialab/postcss-dart-sass').then(
                        ({ default: postcssSass, alternatives }) =>
                            postcssSass({
                                rootDir: build.getSourceRoot(),
                                importer: (url, prev, done) => {
                                    // some modules use ~ or package: for node_modules import
                                    const normalizedUrl = url.replace(/^(~|package:)/, '');
                                    (async () => {
                                        try {
                                            if (cache.has(normalizedUrl)) {
                                                return done(cache.get(normalizedUrl));
                                            }

                                            const splitted = normalizedUrl.split('/');
                                            const checks = [];
                                            if (
                                                splitted.length === 1 ||
                                                (normalizedUrl[0] === '@' && splitted.length === 2)
                                            ) {
                                                checks.push(normalizedUrl);
                                            } else {
                                                checks.push(...alternatives(normalizedUrl));
                                            }

                                            for (let i = 0; i < checks.length; i++) {
                                                try {
                                                    const result = await build.resolve(checks[i], {
                                                        kind: 'import-rule',
                                                        importer: prev || args.path,
                                                        namespace: 'file',
                                                        pluginData: null,
                                                        resolveDir: prev ? path.dirname(prev) : path.dirname(args.path),
                                                    });

                                                    if (!result || !result.path) {
                                                        continue;
                                                    }

                                                    try {
                                                        const loadResult = await build.load({
                                                            path: result.path,
                                                            suffix: '',
                                                            namespace: 'file',
                                                            pluginData: null,
                                                            with: {},
                                                        });

                                                        if (!loadResult) {
                                                            throw new Error('No contents');
                                                        }

                                                        const importResult = {
                                                            file: result.path,
                                                            contents: /** @type {Buffer} */ (
                                                                loadResult.contents
                                                            ).toString(),
                                                        };

                                                        cache.set(normalizedUrl, {
                                                            file: result.path,
                                                            contents: '',
                                                        });
                                                        return done(importResult);
                                                    } catch (err) {
                                                        if (
                                                            err &&
                                                            /** @type {Error & { code?: string }} */ (err).code ===
                                                                'ENOENT'
                                                        ) {
                                                            continue;
                                                        }

                                                        cache.set(normalizedUrl, err);
                                                        return done(/** @type {Error} */ (err));
                                                    }
                                                } catch {
                                                    //
                                                }
                                            }

                                            cache.set(normalizedUrl, null);
                                            done(null);
                                        } catch (err) {
                                            cache.set(normalizedUrl, err);
                                            done(/** @type {Error} */ (err));
                                        }
                                    })();
                                },
                            })
                    );
                    plugins.push(sassPlugin);
                }

                plugins.push(...(options.plugins || []));

                if (!plugins.length) {
                    return;
                }

                const { default: postcss } = await import('postcss');

                /**
                 * @type {import('postcss').ProcessOptions}
                 */
                const finalConfig = {
                    from: args.path,
                    ...(config.options || {}),
                    ...options,
                    ...(isSass
                        ? {
                              syntax: await import('postcss-scss').then(({ default: postcssSass }) => postcssSass),
                          }
                        : {}),
                    map: sourcemap
                        ? {
                              inline: false,
                              sourcesContent: true,
                              annotation: false,
                          }
                        : false,
                };

                const code = args.code;
                const result = await postcss(plugins).process(code, finalConfig);
                const sourceMap = result.map?.toJSON();
                if (sourceMap) {
                    const cwd = absWorkingDir || process.cwd();
                    const argsDir = path.dirname(args.path);
                    sourceMap.sources = sourceMap.sources.map((source) =>
                        path.relative(argsDir, path.resolve(cwd, source))
                    );
                    sourceMap.file = undefined;
                }
                const sourceMapUrl =
                    sourceMap &&
                    `data:application/json;base64,${Buffer.from(JSON.stringify(sourceMap)).toString('base64')}`;
                const dependencies = result.messages
                    .filter(({ type }) => type === 'dependency')
                    .map(({ file }) => file);

                build.collectDependencies(args.path, dependencies);

                return {
                    code: sourceMap
                        ? `${result.css.toString()}\n/*# sourceMappingURL=${sourceMapUrl} */\n`
                        : result.css.toString(),
                    loader: 'css',
                    watchFiles: dependencies,
                };
            });
        },
    };

    return plugin;
}
