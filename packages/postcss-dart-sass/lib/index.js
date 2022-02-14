import { access } from 'fs/promises';
import path from 'path';
import sass from 'sass';
import { SourceMapConsumer, SourceMapGenerator } from 'source-map';
import sassResolver, { alternatives } from './sassResolver.js';

const sassMatch = /#sass$/;

export { alternatives };
export const resolver = sassResolver;

/**
 * @param {import('source-map').RawSourceMap[]} maps
 */
async function mergeSourceMaps(...maps) {
    // new sourcemap
    const generator = new SourceMapGenerator();

    // existing sourcemaps
    const consumersPromise = Promise.all(maps.map(
        map => new SourceMapConsumer(map)
    ));

    return consumersPromise
        .then((consumers) => consumers.forEach((consumer) => {
            consumer.eachMapping(
                /**
                 * @param {*} mapping
                 */
                (mapping) => {
                    const originalPosition = originalPositionFor(mapping, consumers);

                    if (originalPosition.line != null &&
                        originalPosition.column != null &&
                        originalPosition.source) {
                        generator.addMapping({
                            generated: {
                                line: mapping.generatedLine,
                                column: mapping.generatedColumn,
                            },
                            original: {
                                line: Math.abs(originalPosition.line),
                                column: Math.abs(originalPosition.column),
                            },
                            source: originalPosition.source,
                            name: originalPosition.name || undefined,
                        });
                    }
                }
            );

            // copy each original source to the new sourcemap
            consumer.sources.forEach(
                /**
                 * @param {*} source
                 */
                (source) => {
                    (/** @type {*} */ (generator))._sources.add(source);

                    const content = consumer.sourceContentFor(source);

                    if (content !== null) {
                        generator.setSourceContent(source, content);
                    }
                }
            );
        })).then(() => {
            const mergedMap = generator.toJSON();
            mergedMap.sources = mergedMap.sources.map(
                (source) => source.replace(sassMatch, '')
            );

            return mergedMap;
        });
}

/**
 * @param {*} mapping
 * @param {SourceMapConsumer[]} consumers
 */
function originalPositionFor(mapping, consumers) {
    /**
     * @type {import('source-map').NullableMappedPosition}
     */
    let originalPosition = {
        line: mapping.generatedLine,
        column: mapping.generatedColumn,
        name: null,
        source: null,
    };

    // special sass sources are mapped in reverse
    consumers.slice(0).reverse().forEach((consumer) => {
        const possiblePosition = consumer.originalPositionFor({
            line: /** @type {number} */ (originalPosition.line),
            column: /** @type {number} */ (originalPosition.column),
        });

        if (possiblePosition.source) {
            if (sassMatch.test(possiblePosition.source)) {
                originalPosition = possiblePosition;
            }
        }
    });

    consumers.forEach((consumer) => {
        const possiblePosition = consumer.originalPositionFor({
            line: /** @type {number} */ (originalPosition.line),
            column: /** @type {number} */ (originalPosition.column),
        });

        if (possiblePosition.source) {
            if (!sassMatch.test(possiblePosition.source)) {
                originalPosition = possiblePosition;
            }
        }
    });

    return originalPosition;
}

/**
 * @typedef {import('sass').LegacySharedOptions<'async'> & { rootDir?: string }} PluginOptions
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
                    const resolved = path.resolve(path.dirname(outFile), position.source.replace(/^file:\/\//, ''));
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
        async Once(root, { result, parse }) {
            const extname = result.opts.from ? path.extname(result.opts.from) : null;
            if (extname !== '.scss' && extname !== '.sass') {
                return;
            }

            const initialCss = root.toResult({
                ...result.opts,
                map: {
                    inline: false,
                    annotation: false,
                    sourcesContent: true,
                },
            });

            const rootDir = options.rootDir || process.cwd();
            const outFile = (result.opts.to || result.opts.from);

            /**
             * @type {import('sass').LegacyOptions<'async'>}
             */
            const computedOptions = {
                includePaths: [rootDir],
                importer: [
                    ...(Array.isArray(options.importer) ? options.importer : options.importer ? [options.importer] : []),
                    sassResolver(rootDir),
                ],
                outputStyle: 'expanded',
                ...options,
                sourceMap: true,
                omitSourceMapUrl: true,
                data: initialCss.css,
            };

            if (result.opts.from) {
                computedOptions.file = result.opts.from;
                computedOptions.outFile = `${outFile || result.opts.from}.map`;
            }

            /**
             * @type {import('sass').LegacyResult}
             */
            const sassResult = await new Promise((resolve, reject) => sass.render(computedOptions, (err, result) => {
                if (err) {
                    reject(err);
                } else if (result) {
                    resolve(result);
                }
            }));
            const sassCssOutput = sassResult.css.toString();
            const sassSourcemap = JSON.parse((/** @type {Buffer} */ (sassResult.map)).toString());
            const parsed = await parse(sassCssOutput.replace(/\/\*#[^*]+?\*\//g, (match) => ''.padStart(match.length, ' ')), {
                ...result.opts,
                map: {
                    prev: await mergeSourceMaps(sassSourcemap),
                    annotation: false,
                    inline: false,
                    sourcesContent: true,
                },
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
                sassResult.stats.includedFiles.map(async (file) => {
                    try {
                        await access(file);
                        return file;
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
