import path from 'path';
import postcss from 'postcss';
import nodeResolve from 'resolve';
import { getRequestFilePath } from '@web/dev-server-core';
import postcssrc from 'postcss-load-config';

/**
 * @typedef {Object} PostcssConfig
 * @property {import('postcss').ProcessOptions} [options]
 * @property {import('postcss').Plugin[]} [plugins]
 */

/**
 * Load local postcss config.
 * @return {Promise<PostcssConfig>}
 */
async function loadPostcssConfig() {
    try {
        /**
         * @type {any}
         */
        let result = await postcssrc();
        return result;
    } catch {
        //
    }

    return {};
}

function rebase({ rootDir = process.cwd(), filePath = '' } = {}) {
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

                let resolvedImportPath = await new Promise((resolve, reject) => nodeResolve(source, {
                    basedir: rootDir,
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

                const normalizedPath = path.normalize(resolvedImportPath);
                if (!normalizedPath.startsWith(rootDir)) {
                    const relativePath = path.relative(rootDir, normalizedPath);
                    const dirUp = `..${path.sep}`;
                    const lastDirUpIndex = relativePath.lastIndexOf(dirUp) + 3;
                    const dirUpStrings = relativePath.substring(0, lastDirUpIndex).split(path.sep);
                    if (dirUpStrings.length === 0 || dirUpStrings.some(str => !['..', ''].includes(str))) {
                        throw new Error(`Resolved ${source} to ${resolvedImportPath}`);
                    }

                    const importPath = relativePath.substring(lastDirUpIndex).split(path.sep).join('/');
                    resolvedImportPath = `/__wds-outside-root__/${dirUpStrings.length - 1}/${importPath}`;
                } else {
                    const resolveRelativeTo = path.extname(filePath) ? path.dirname(filePath) : filePath;
                    const relativeImportFilePath = path.relative(resolveRelativeTo, resolvedImportPath);
                    resolvedImportPath = `./${relativeImportFilePath.split(path.sep).join('/')}`;
                }

                decl.params = `url('${resolvedImportPath}')`;
            },
        },
    };

    return plugin;
}

/**
 * Create a server plugin instance that resolves css assets.
 * @return A server plugin.
 */
export function cssPlugin() {
    /**
     * @type {import('@web/dev-server-core').DevServerCoreConfig}
     */
    let config;
    let rootDir = '';

    /**
     * @type {import('@web/dev-server-core').Plugin}
     */
    const plugin = {
        name: 'css-url',
        async serverStart(args) {
            config = args.config;
            rootDir = config.rootDir;
        },
        async transform(context) {
            if (context.response.is('css')) {
                const filePath = getRequestFilePath(context.url, rootDir);
                const options = await loadPostcssConfig();
                /**
                 * @type {import('postcss').ProcessOptions}
                 */
                const config = {
                    map: {
                        inline: true,
                    },
                    from: filePath,
                    ...(options.options || {}),
                };

                const result = await postcss([
                    rebase({
                        rootDir,
                        filePath,
                    }),
                    ...(options.plugins || []),
                ]).process(/** @type {string} */ (context.body), config);

                return { body: result.css.toString() };
            }
        },
    };

    return plugin;
}
