import path from 'path';
import postcss from 'postcss';
import nodeResolve from 'resolve';

function rebase({ rootDir = process.cwd(), importer = '' } = {}) {
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
                if (spec.startsWith('.') ||
                    spec.startsWith('/') ||
                    spec.startsWith('http:') ||
                    spec.startsWith('https:')) {
                    return;
                }

                let resolved = await new Promise((resolve, reject) => nodeResolve(spec, {
                    basedir: rootDir,
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

                let relativePath = path.relative(importer, resolved);
                decl.params = `url('${relativePath}')`;
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
                let file = path.resolve(rootDir, `.${context.url}`);
                let config = {
                    map: true,
                    from: file,
                };

                let result = await postcss([
                    rebase({
                        rootDir,
                        importer: file,
                    }),
                ]).process(/** @type {string} */ (context.body), config);

                return { body: result.css.toString() };
            }
        },
    };

    return plugin;
}
