import path from 'path';
import postcss from 'postcss';
import nodeResolve from 'resolve';

function rebase({ root = process.cwd() } = {}) {
    /**
     * @type {import('postcss').Plugin}
     */
    const plugin = {
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
                    let resolved = await new Promise((resolve, reject) => nodeResolve(spec, {
                        basedir: root,
                        extensions: ['.css'],
                        preserveSymlinks: true,
                        packageFilter(pkg) {
                            if (pkg.style) {
                                pkg.main = pkg.style;
                            }
                        },
                    }, (err, data) => (err ? reject(err) : resolve(data))));

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

    return plugin;
}

/**
 * Create a server plugin instance that resolves css assets.
 * @param {{ root: string }} config
 * @returns
 */
export function cssPlugin({ root }) {
    /**
     * @type {import('@web/dev-server-core').Plugin}
     */
    const plugin = {
        name: 'css-url',
        async transform(context) {
            if (context.response.is('css')) {
                let config = {
                    map: true,
                    from: path.resolve(root, context.url),
                };

                let result = await postcss([
                    rebase({ root }),
                ]).process(/** @type {string} */ (context.body), config);

                return { body: result.css.toString() };
            }
        },
    };

    return plugin;
}
