import { promises } from 'fs';
import postcss from 'postcss';
import postcssrc from 'postcss-load-config';
import autoprefixer from 'autoprefixer';
import unset from 'postcss-all-unset';
import customProperties from 'postcss-custom-properties';
import focusVisible from 'postcss-focus-visible';
import focusWithin from 'postcss-focus-within';

const { readFile } = promises;

export function postcssPlugin(opts = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'postcss',
        setup(build) {
            build.onLoad({ filter: /\.css$/, namespace: 'file' }, async ({ path: filePath }) => {
                let contents = await readFile(filePath, 'utf-8');
                let config = {
                    from: filePath,
                    map: true,
                    ...opts,
                };

                let options = await postcssrc();
                let plugins = (options.plugins || [
                    autoprefixer({
                        grid: true,
                        flexbox: true,
                        remove: false,
                    }),
                    customProperties({
                        preserve: true,
                    }),
                    unset(),
                    focusVisible(),
                    focusWithin({
                        replaceWith: '.focus-within',
                    }),
                ]);

                let result = await postcss(plugins).process(contents, config);

                return {
                    contents: result.css.toString(),
                    loader: 'css',
                };
            });
        },
    };

    return plugin;
}
