const { promises: { readFile } } = require('fs');
const postcss = require('postcss');
const postcssImport = require('postcss-import');
const autoprefixer = require('autoprefixer');
const unset = require('postcss-all-unset');
const customProperties = require('postcss-custom-properties');
const focusVisible = require('postcss-focus-visible');
const focusWithin = require('postcss-focus-within');
const rewrite = require('./postcss-rewrite');

module.exports = function(entryPoint, code, root, targets, transform) {
    return {
        name: 'postcss',
        setup(build) {
            build.onLoad({ filter: /\.(css)$/, namespace: 'file' }, async ({ path: filePath }) => {
                let contents;
                if (entryPoint === filePath) {
                    contents = code;
                } else {
                    contents = await readFile(filePath, 'utf-8');
                }

                let config = {
                    from: filePath,
                    map: true,
                };

                let result = await postcss([
                    postcssImport({
                        root,
                    }),
                    rewrite({
                        root,
                    }),
                    transform && autoprefixer({
                        overrideBrowserslist: targets,
                        grid: true,
                        flexbox: true,
                        remove: false,
                    }),
                    transform && customProperties({
                        preserve: true,
                    }),
                    transform && unset(),
                    transform && focusVisible(),
                    transform && focusWithin({
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
