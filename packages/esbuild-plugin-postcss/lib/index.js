import path from 'path';
import { promises } from 'fs';
import nodeResolve from 'resolve';
import postcss from 'postcss';
import preset from '@chialab/postcss-preset-chialab';
import postcssrc from 'postcss-load-config';

const { readFile } = promises;

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

function rebase({ rootDir = process.cwd() } = {}) {
    /**
     * @type {import('postcss').Plugin}
     */
    const plugin = {
        postcssPlugin: 'postcss-rebase',
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

/**
 * Instantiate a plugin that runs postcss across css files.
 * @return An esbuild plugin.
 */
export default function(opts = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'postcss',
        setup(build) {
            build.onLoad({ filter: /\.css$/, namespace: 'file' }, async ({ path: filePath }) => {
                let contents = await readFile(filePath, 'utf-8');
                let options = await loadPostcssConfig();
                let plugins = [
                    rebase(),
                    ...(options.plugins || [preset()]),
                ];

                let config = {
                    from: filePath,
                    map: true,
                    ...(options.options || {}),
                    ...opts,
                };
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
