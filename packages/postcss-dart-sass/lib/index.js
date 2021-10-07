import { access } from 'fs/promises';
import path from 'path';
import postcss from 'postcss';
import sass from 'sass';
import sassResolver from './sassResolver.js';

/**
 * @typedef {import('sass').Options & { rootDir?: string, alias?: import('@chialab/node-resolve').AliasMap }} PluginOptions
 */

/**
 * @param {string} path
 */
async function exists(path) {
    try {
        await access(path);
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * @param {string} outFile
 */
function createDefaultResolver(outFile) {
    /**
     * @param {string} url
     * @param {import('postcss').Declaration} decl
     */
    return async (url, decl) => {
        if (url.indexOf('data:') === 0) {
            return;
        }

        if (!outFile) {
            return;
        }

        const declSource = decl.source;
        if (!declSource) {
            return;
        }

        const importee = declSource && declSource.input && declSource.input.file;
        const map = declSource && declSource.input && declSource.input.map;
        if (!importee) {
            return;
        }

        const mapImportee = map && await (async () => {
            if (declSource.start) {
                const position = map.consumer().originalPositionFor(declSource.start);
                if (position && position.source) {
                    const resolved = path.resolve(path.dirname(outFile), position.source);
                    if (await exists(resolved)) {
                        return resolved;
                    }
                }
            }
        })();

        const file = path.resolve(
            path.dirname(mapImportee || importee),
            url.split('?')[0]
        );

        if (!(await exists(file))) {
            return;
        }

        return path.relative(path.dirname(outFile), file);
    };
}

/**
 * A postcss plugin sass transpilation.
 * @param {PluginOptions} options
 */
export default function(options = {}) {
    /**
     * @type {import('postcss').Plugin}
     */
    const plugin = {
        postcssPlugin: 'postcss-dart-sass',
        async Once(root, { result }) {
            const extname = result.opts.from ? path.extname(result.opts.from) : null;
            if (extname !== '.scss' && extname !== '.sass') {
                return;
            }

            const initialMap = typeof result.opts.map === 'object' ? result.opts.map : {};
            const initialCss = root.toResult({
                ...result.opts,
                map: {
                    annotation: false,
                    inline: false,
                    sourcesContent: true,
                    ...initialMap,
                },
            });

            const outFile = (result.opts.to || result.opts.from);

            /**
             * @type {import('sass').Options}
             */
            const computedOptions = {
                includePaths: [
                    options.rootDir || process.cwd(),
                ],
                importer: sassResolver({ alias: options.alias }),
                indentWidth: 4,
                omitSourceMapUrl: true,
                outputStyle: 'expanded',
                sourceMap: true,
                sourceMapContents: true,
                ...options,
                data: initialCss.css,
                file: result.opts.from,
                outFile,
            };

            const sassResult = sass.renderSync(computedOptions);

            const css = sassResult.css.toString();
            const map = sassResult.map && sassResult.map.toString();

            const parsed = await postcss.parse(css, {
                from: result.opts.from,
                map: map ? {
                    prev: JSON.parse(map),
                } : undefined,
            });

            if (outFile) {
                /**
                 * @type {Promise<void>[]}
                 */
                const promises = [];
                const resolver = createDefaultResolver(outFile);

                parsed.walkDecls((decl) => {
                    const declSource = decl.source;
                    const declValue = decl.value;
                    if (!declValue || !declSource || !declSource.input) {
                        return;
                    }

                    if (declValue.indexOf('url(') === -1) {
                        return;
                    }

                    const match = declValue.match(/url\(['"]?.*?['"]?\)/ig) || [];
                    const urls = match
                        .map((entry) => entry.replace(/^url\(['"]?/i, '').replace(/['"]?\)$/i, ''))
                        .filter(Boolean);

                    promises.push(
                        ...urls.map(async (url) => {
                            const file = await resolver(url, decl);
                            if (file) {
                                decl.value = decl.value.replace(url, file);
                            }
                        })
                    );
                });

                await Promise.all(promises);
            }

            result.root = parsed;

            const dependencies = await Promise.all(
                sassResult.stats.includedFiles.map(async (fileName) => {
                    try {
                        await access(fileName);
                        return fileName;
                    } catch (err) {
                        //
                    }
                    return null;
                })
            );

            dependencies
                .filter((fileName) => !!fileName)
                .forEach((fileName) => {
                    result.messages.push({
                        type: 'dependency',
                        plugin: 'postcss-dart-sass',
                        file: fileName,
                        parent: result.opts.from,
                    });
                });
        },
    };

    return plugin;
}
