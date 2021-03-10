const { promises: { readFile } } = require('fs');
const postcss = require('postcss');
const autoprefixer = require('autoprefixer');
const unset = require('postcss-all-unset');
const customProperties = require('postcss-custom-properties');
const focusVisible = require('postcss-focus-visible');
const focusWithin = require('postcss-focus-within');

module.exports = function(opts = {}) {
    return {
        name: 'postcss',
        setup(build) {
            build.onLoad({ filter: /\.css$/, namespace: 'file' }, async ({ path: filePath }) => {
                let contents = await readFile(filePath, 'utf-8');
                let config = {
                    from: filePath,
                    map: true,
                    ...opts,
                };

                let result = await postcss([
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
                ].filter(Boolean)).process(contents, config);

                return {
                    contents: result.css.toString(),
                    loader: 'css',
                };
            });
        },
    };
};
