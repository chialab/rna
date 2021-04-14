import path from 'path';
import postcss from 'postcss';
import nodeResolve from 'resolve';
import { getRequestFilePath } from '@web/dev-server-core';
import { loadPostcssConfig } from '../helpers/loadPostcssConfig.js';

function rebase({ rootDir = process.cwd(), filePath = '' } = {}) {
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

                let source = match[1];
                if (source.startsWith('.') ||
                    source.startsWith('/') ||
                    source.startsWith('http:') ||
                    source.startsWith('https:')) {
                    return;
                }

                let resolvedImportPath = await new Promise((resolve, reject) => nodeResolve(source, {
                    basedir: rootDir,
                    extensions: ['.css'],
                    preserveSymlinks: true,
                    packageFilter(pkg) {
                        if (pkg.style) {
                            pkg.main = pkg.style;
                        }
                    },
                }, (err, data) => (err ? reject(err) : resolve(data))));

                if (path.extname(resolvedImportPath) !== '.css') {
                    return;
                }

                let normalizedPath = path.normalize(resolvedImportPath);
                if (!normalizedPath.startsWith(rootDir)) {
                    let relativePath = path.relative(rootDir, normalizedPath);
                    let dirUp = `..${path.sep}`;
                    let lastDirUpIndex = relativePath.lastIndexOf(dirUp) + 3;
                    let dirUpStrings = relativePath.substring(0, lastDirUpIndex).split(path.sep);
                    if (dirUpStrings.length === 0 || dirUpStrings.some(str => !['..', ''].includes(str))) {
                        throw new Error(`Resolved ${source} to ${resolvedImportPath}`);
                    }

                    let importPath = relativePath.substring(lastDirUpIndex).split(path.sep).join('/');
                    resolvedImportPath = `/__wds-outside-root__/${dirUpStrings.length - 1}/${importPath}`;
                } else {
                    let resolveRelativeTo = path.extname(filePath) ? path.dirname(filePath) : filePath;
                    let relativeImportFilePath = path.relative(resolveRelativeTo, resolvedImportPath);
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
                let filePath = getRequestFilePath(context.url, rootDir);
                let options = await loadPostcssConfig();
                /**
                 * @type {import('postcss').ProcessOptions}
                 */
                let config = {
                    map: {
                        inline: true,
                    },
                    from: filePath,
                    ...(options.options || {}),
                };

                let result = await postcss([
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
