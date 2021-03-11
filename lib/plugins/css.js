function rebase({ root = process.cwd() } = {}) {
    const path = require('path');
    const resolve = require('util').promisify(require('resolve'));

    return {
        postcssPlugin: 'postcss-rewrite',
        AtRule: {
            async import(decl) {
                let match = decl.params.match(/url\(['"]?(.*?)['"]?\)/);
                if (!match || !match[1]) {
                    return;
                }

                let spec = match[1];
                if (spec[0] === '.' || spec[0] === '/') {
                    return;
                }

                try {
                    let resolved = await resolve(spec, {
                        basedir: root,
                        extensions: ['.css'],
                        preserveSymlinks: true,
                        packageFilter(pkg) {
                            if (pkg.style) {
                                pkg.main = pkg.style;
                            }
                        },
                    });

                    if (path.extname(resolved) !== '.css') {
                        return;
                    }

                    let relativePath = path.relative(root, resolved);
                    let dirUp = `..${path.sep}`;
                    let lastDirUpIndex = relativePath.lastIndexOf(dirUp) + 3;
                    let dirUpStrings = relativePath.substring(0, lastDirUpIndex).split(path.sep);
                    if (dirUpStrings.length === 0 || dirUpStrings.some(str => !['..', ''].includes(str))) {
                        return;
                    }

                    let importPath = relativePath.substring(lastDirUpIndex).split(path.sep).join('/');
                    let resolvedImportPath = `/__wds-outside-root__/${dirUpStrings.length - 1}/${importPath}`;
                    decl.params = `url('${resolvedImportPath}')`;
                } catch(err) {
                    //
                }
            },
        },
    };
}

module.exports = function css({ root }) {
    const postcss = require('postcss');

    return {
        async transform(context) {
            if (context.response.is('css')) {
                let config = {
                    map: true,
                };

                let result = await postcss([
                    rebase({ root }),
                ].filter(Boolean)).process(context.body, config);

                return { body: result.css.toString() };
            }
        },
    };
};
