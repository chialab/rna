import { promises } from 'fs';
import path from 'path';
import MagicString from 'magic-string';
import nodeResolve from 'resolve';

const { readFile } = promises;

const URL_REGEX = /(new\s+(?:window\.|self\.|globalThis\.)?URL\s*\()\s*['"]([^'"]*)['"]\s*\s*,\s*import\.meta\.url\s*(\))/g;
const SCRIPT_LOADERS = ['tsx', 'ts', 'jsx', 'js'];

/**
 * @param {import('esbuild').OnLoadArgs & { contents?: string }} args
 * @return {Promise<import('esbuild').OnLoadResult>}
 */
async function loadFile({ path: filePath, contents }) {
    return {
        contents: contents || await readFile(filePath),
        loader: 'file',
    };
}

/**
 * @param {import('esbuild').OnLoadArgs & { contents?: string }} args
 * @param {import('esbuild').BuildOptions} options
 * @return {Promise<import('esbuild').OnLoadResult>}
 */
async function transformUrls({ path: filePath, contents }, options) {
    contents = contents || await readFile(filePath, 'utf-8');
    if (!contents.match(URL_REGEX)) {
        return { contents };
    }

    let baseUrl = (options.platform === 'browser' && 'document.baseURI') || 'import.meta.url';
    let magicCode = new MagicString(contents);
    let match = URL_REGEX.exec(contents);
    while (match) {
        let len = match[0].length;
        let value = match[2];

        if (value[0] !== '.' && value[0] !== '/') {
            value = `./${value}`;
        }

        let identifier = `_${value.replace(/[^a-zA-Z0-9]/g, '_')}`;
        magicCode.prepend(`import ${identifier} from '${value}.file';`);
        magicCode.overwrite(match.index, match.index + len, `${match[1]}${identifier}, ${baseUrl}${match[3]}`);

        match = URL_REGEX.exec(contents);
    }

    let magicMap = magicCode.generateMap({ hires: true });
    let magicUrl = `data:application/json;charset=utf-8;base64,${Buffer.from(magicMap.toString()).toString('base64')}`;

    return {
        contents: `${magicCode.toString()}//# sourceMappingURL=${magicUrl}`,
    };
}

/**
 * Instantiate a plugin that converts URL references into static import
 * in order to handle assets bundling.
 * @return An esbuild plugin.
 */
export function urlPlugin() {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'url',
        setup(build, { transform } = { transform: null }) {
            let options = build.initialOptions;
            let loaders = options.loader || {};
            let keys = Object.keys(loaders);
            let tsxExtensions = keys.filter((key) => SCRIPT_LOADERS.includes(loaders[key]));
            let tsxRegex = new RegExp(`\\.(${tsxExtensions.map((ext) => ext.replace('.', '')).join('|')})$`);

            build.onResolve({ filter: /^https?:\/\// }, ({ path: filePath }) => ({ path: filePath, external: true }));

            build.onResolve({ filter: /\.file$/ }, async ({ path: filePath, importer }) => ({
                path: await new Promise((resolve, reject) => nodeResolve(filePath.replace(/\.file$/, ''), {
                    basedir: path.dirname(importer),
                    preserveSymlinks: true,
                }, (err, data) => (err ? reject(err) : resolve(data)))),
                namespace: 'url',
            }));

            if (transform) {
                let args = /** @type {import('esbuild').OnLoadArgs} */ (/** @type {unknown} */ (transform));
                if (args.namespace === 'url') {
                    return /** @type {void} */ (/** @type {unknown} */ (loadFile(args)));
                }
                if (!keys.includes(path.extname(args.path))) {
                    return /** @type {void} */ (/** @type {unknown} */ (loadFile(args)));
                }
                if (args.path.match(tsxRegex)) {
                    return /** @type {void} */ (/** @type {unknown} */ (transformUrls(args, options)));
                }

                return /** @type {void} */ (/** @type {unknown} */ (args));
            }

            build.onLoad({ filter: /\./, namespace: 'url' }, loadFile);
            build.onLoad({ filter: /\./, namespace: 'file' }, async (args) => {
                if (keys.includes(path.extname(args.path))) {
                    return;
                }

                return loadFile(args);
            });

            build.onLoad({ filter: tsxRegex, namespace: 'file' }, async (args) => transformUrls(args, options));
        },
    };

    return plugin;
}
