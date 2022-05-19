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
 * Get the original declaration file.
 * @param {import('postcss').Declaration} decl
 * @param {string} filePath
 */
function getDeclFile(decl, filePath) {
    const source = decl.source;
    if (!source) {
        return;
    }

    const importee = source.input && source.input.file;
    const map = source.input && source.input.map;
    if (!map || !source.start) {
        return importee;
    }

    const consumer = map.consumer();
    const position = consumer.originalPositionFor(source.start);
    if (position && position.source) {
        return path.resolve(filePath, position.source);
    }

    return importee;
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
            const opts = result.opts;
            const from = opts.from;
            const extname = from ? path.extname(from) : null;
            if (extname !== '.scss' && extname !== '.sass') {
                return;
            }

            const initialCss = root.toResult({
                ...opts,
                map: {
                    inline: false,
                    annotation: false,
                    sourcesContent: true,
                },
            });

            const rootDir = options.rootDir || process.cwd();
            const outFile = opts.to || from;

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

            if (from) {
                computedOptions.file = from;
                computedOptions.outFile = `${outFile}.map`;
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

                parsed.walkDecls((decl) => {
                    /**
                     * @type {string|undefined}
                     */
                    const originalFile = getDeclFile(decl, path.dirname(outFile));
                    if (!originalFile) {
                        return;
                    }

                    if (!decl.value || decl.value.indexOf('url(') === -1) {
                        return;
                    }

                    const matches = decl.value.match(/url\(.*?\)/gi) || [];
                    promises.push(
                        ...matches.map(async (source) => {
                            const match = source.match(/url\((['"]?.*?['"]?)\)/);
                            if (!match) {
                                return;
                            }

                            const requestedImportPath = match[1]
                                .replace(/^['"]/, '')
                                .replace(/['"]$/, '')
                                .replace(/^~/, '');

                            if (requestedImportPath.indexOf('data:') === 0) {
                                return;
                            }

                            const resolvedImportPath = path.relative(path.dirname(outFile), path.resolve(path.dirname(originalFile), requestedImportPath));
                            decl.value = decl.value.replace(match[0], `url('${resolvedImportPath}')`);
                        })
                    );
                });

                await Promise.all(promises);
            }

            result.root = parsed;

            sassResult.stats.includedFiles
                .filter((fileName) => !!fileName)
                .forEach((fileName) => {
                    result.messages.push({
                        type: 'dependency',
                        plugin: 'postcss-dart-sass',
                        file: fileName,
                        parent: from,
                    });
                });
        },
    };

    return plugin;
}
