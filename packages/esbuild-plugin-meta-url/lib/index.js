import { promises } from 'fs';
import path from 'path';
import esbuildModule from 'esbuild';
import MagicString from 'magic-string';
import nodeResolve from 'resolve';

const { readFile } = promises;

const URL_REGEX = /(new\s+(?:window\.|self\.|globalThis\.)?URL\s*\()\s*['"]([^'"]*)['"]\s*\s*,\s*import\.meta\.url\s*(\))/g;
const SCRIPT_LOADERS = ['tsx', 'ts', 'jsx', 'js'];

/**
 * @param {string} spec
 * @param {string} importer
 */
function resolve(spec, importer) {
    return new Promise((resolve, reject) => nodeResolve(spec, {
        basedir: path.dirname(importer),
        preserveSymlinks: true,
    }, (err, data) => (err ? reject(err) : resolve(data))));
}

/**
 * @param {import('esbuild').OnLoadArgs & { contents?: string }} args
 * @param {import('esbuild').BuildOptions} options
 * @param {import('esbuild')} esbuild
 * @param {string} contents
 * @return {Promise<import('esbuild').OnLoadResult>}
 */
async function transformUrls({ path: filePath }, options, esbuild, contents = '') {
    contents = contents || await readFile(filePath, 'utf-8');
    if (!contents.match(URL_REGEX)) {
        return { contents };
    }

    let outdir = options.outdir || (options.outfile && path.dirname(options.outfile)) || process.cwd();
    let loaders = options.loader || {};
    let magicCode = new MagicString(contents);
    let match = URL_REGEX.exec(contents);
    while (match) {
        let len = match[0].length;
        let value = match[2];

        if (value[0] !== '.' && value[0] !== '/') {
            value = `./${value}`;
        }

        let loader = loaders[path.extname(filePath)];
        if (SCRIPT_LOADERS.includes(loader) || loader === 'css') {
            /** @type {import('esbuild').BuildOptions} */
            let config = {
                ...options,
                entryPoints: [await resolve(value, filePath)],
                outfile: undefined,
                outdir,
                metafile: true,
            };
            let result = await esbuild.build(config);
            if (result.metafile) {
                let outputs = Object.keys(result.metafile.outputs);
                let outputFile = outputs[0].endsWith('.map') ? outputs[1] : outputs[0];
                let baseUrl = 'import.meta.url';
                magicCode.overwrite(match.index, match.index + len, `${match[1]}'./${path.basename(outputFile)}', ${baseUrl}${match[3]}`);
            }
        } else {
            let baseUrl = (options.platform === 'browser' && 'document.baseURI') || 'import.meta.url';
            let identifier = `_${value.replace(/[^a-zA-Z0-9]/g, '_')}`;
            magicCode.prepend(`import ${identifier} from '${value}.file';`);
            magicCode.overwrite(match.index, match.index + len, `${match[1]}${identifier}, ${baseUrl}${match[3]}`);
        }

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
export function urlPlugin({ esbuild = esbuildModule } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'meta-url',
        setup(build, { transform } = { transform: null }) {
            let options = build.initialOptions;
            let loaders = options.loader || {};
            let keys = Object.keys(loaders);
            let tsxExtensions = keys.filter((key) => SCRIPT_LOADERS.includes(loaders[key]));
            let tsxRegex = new RegExp(`\\.(${tsxExtensions.map((ext) => ext.replace('.', '')).join('|')})$`);

            if (transform) {
                let { args, contents } = /** @type {{ args: import('esbuild').OnLoadArgs, contents?: string }} */ (/** @type {unknown} */ (transform));
                if (args.path.match(tsxRegex)) {
                    return /** @type {void} */ (/** @type {unknown} */ (transformUrls(args, options, esbuild, contents)));
                }

                return;
            }

            build.onLoad({ filter: tsxRegex, namespace: 'file' }, (args) => transformUrls(args, options, esbuild));
        },
    };

    return plugin;
}
