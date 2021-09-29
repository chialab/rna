import { access } from 'fs/promises';
import path from 'path';
import postcss from 'postcss';
import sass from 'sass';
import sassResolver from './sassResolver.js';

/**
 * A postcss plugin sass transpilation.
 * @param {import('sass').Options} options
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

            const map = typeof result.opts.map === 'object' ? result.opts.map : {};
            const css = root.toResult({
                ...result.opts,
                map: {
                    annotation: false,
                    inline: false,
                    sourcesContent: true,
                    ...map,
                },
            });

            /**
             * @type {import('sass').Options}
             */
            const computedOptions = {
                includePaths: ['node_modules'],
                importer: sassResolver(),
                indentWidth: 4,
                omitSourceMapUrl: true,
                outputStyle: 'expanded',
                sourceMap: true,
                sourceMapContents: true,
                ...options,
                data: css.css,
                file: result.opts.from,
                outFile: result.opts.to,
            };

            const sassResult = sass.renderSync(computedOptions);
            const parsed = await postcss.parse(sassResult.css.toString(), {
                from: result.opts.from,
                map: sassResult.map && {
                    prev: JSON.parse(sassResult.map.toString()),
                },
            });
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
