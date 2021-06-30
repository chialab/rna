import path from 'path';
import nodeResolve from 'resolve';

/**
 * @typedef {Object} UrlRebasePluginOptions
 * @property {string} [root] The root dir of the build.
 */

/**
 * A postcss plugin for url() rebasing before import.
 * @param {UrlRebasePluginOptions} options
 */
export default function urlRebase({ root = process.cwd() } = {}) {
    /**
     * @type {import('postcss').Plugin}
     */
    const plugin = {
        postcssPlugin: 'postcss-rebase',
        AtRule: {
            async import(decl) {
                const match = decl.params.match(/url\(['"]?(.*?)['"]?\)/);
                if (!match || !match[1]) {
                    return;
                }

                let source = match[1];
                if (source.startsWith('.') ||
                    source.startsWith('/') ||
                    source.startsWith('http:') ||
                    source.startsWith('https:')) {
                    return;
                }

                if (source.startsWith('~')) {
                    source = source.substring(1);
                }

                const resolvedImportPath = await new Promise((resolve, reject) => nodeResolve(source, {
                    basedir: root,
                    extensions: ['.css'],
                    preserveSymlinks: true,
                    packageFilter(pkg) {
                        if (pkg.style) {
                            pkg.main = pkg.style;
                        }
                        return pkg;
                    },
                }, (err, data) => (err ? reject(err) : resolve(data))));

                if (path.extname(resolvedImportPath) !== '.css') {
                    return;
                }

                decl.params = `url('${resolvedImportPath}')`;
            },
        },
    };

    return plugin;
}
