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
 * @param {import('esbuild').OnLoadArgs} args
 * @param {import('esbuild').BuildOptions} options
 * @param {import('esbuild')} esbuild
 * @param {{ code?: string }} cache
 * @param {boolean} pipe
 * @return {Promise<import('esbuild').OnLoadResult|undefined>}
 */
async function transformUrls({ path: filePath }, options, esbuild, cache, pipe) {
    let contents = cache.code || await readFile(filePath, 'utf-8');
    if (!contents.match(URL_REGEX)) {
        if (pipe) {
            cache.code = contents;
            return;
        }
        return {
            contents,
            loader: 'tsx',
        };
    }

    let outdir = options.outdir || (options.outfile && path.dirname(options.outfile)) || process.cwd();
    let loaders = options.loader || {};
    let magicCode = new MagicString(contents);
    let match = URL_REGEX.exec(contents);
    while (match) {
        let len = match[0].length;
        let value = match[2];

        let loader = loaders[path.extname(value)];
        let baseUrl = 'import.meta.url';
        if (options.platform === 'browser' && options.format !== 'esm') {
            baseUrl = 'document.baseURI';
        } else if (options.platform === 'node' && options.format !== 'esm') {
            baseUrl = '\'file://\' + __filename';
        }
        let entryPoint = await resolve(value, filePath);
        if (SCRIPT_LOADERS.includes(loader) || loader === 'css') {
            /** @type {import('esbuild').BuildOptions} */
            let config = {
                ...options,
                entryPoints: [entryPoint],
                outfile: undefined,
                outdir,
                metafile: true,
            };
            let result = await esbuild.build(config);
            if (result.metafile) {
                let outputs = result.metafile.outputs;
                let outputFiles = Object.keys(outputs);
                let outputFile = outputFiles
                    .filter((output) => !output.endsWith('.map'))
                    .filter((output) => outputs[output].entryPoint)
                    .find((output) => entryPoint === path.resolve(/** @type {string} */(outputs[output].entryPoint))) || outputFiles[0];
                magicCode.overwrite(match.index, match.index + len, `${match[1]}'./${path.basename(outputFile)}', ${baseUrl}${match[3]}`);
            }
        } else {
            let identifier = `_${value.replace(/[^a-zA-Z0-9]/g, '_')}`;
            if (contents.startsWith('#!')) {
                magicCode.appendRight(contents.indexOf('\n') + 1, `import ${identifier} from '${entryPoint}.urlfile';\n`);
            } else {
                magicCode.prepend(`import ${identifier} from '${entryPoint}.urlfile';\n`);
            }
            magicCode.overwrite(match.index, match.index + len, `${match[1]}${identifier}, ${baseUrl}${match[3]}`);
        }

        match = URL_REGEX.exec(contents);
    }

    let magicMap = magicCode.generateMap({ hires: true });
    let magicUrl = `data:application/json;charset=utf-8;base64,${Buffer.from(magicMap.toString()).toString('base64')}`;
    contents = `${magicCode.toString()}//# sourceMappingURL=${magicUrl}`;

    if (pipe) {
        cache.code = contents;
        return;
    }
    return {
        contents,
        loader: 'tsx',
    };
}

/**
 * Instantiate a plugin that converts URL references into static import
 * in order to handle assets bundling.
 * @return An esbuild plugin.
 */
export default function({ esbuild = esbuildModule, pipe = false, cache = new Map() } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'meta-url',
        setup(build) {
            let options = build.initialOptions;
            let loaders = options.loader || {};
            let keys = Object.keys(loaders);
            let tsxExtensions = keys.filter((key) => SCRIPT_LOADERS.includes(loaders[key]));
            let tsxRegex = new RegExp(`\\.(${tsxExtensions.map((ext) => ext.replace('.', '')).join('|')})$`);

            build.onResolve({ filter: /\.urlfile$/ }, async ({ path: filePath }) => ({
                path: filePath.replace(/\.urlfile$/, ''),
                namespace: 'meta-url',
            }));
            build.onLoad({ filter: /\./, namespace: 'meta-url' }, async ({ path: filePath }) => ({
                contents: await readFile(filePath),
                loader: 'file',
            }));
            build.onLoad({ filter: tsxRegex, namespace: 'file' }, (args) => {
                cache.set(args.path, cache.get(args.path) || {});
                return transformUrls(args, options, esbuild, cache.get(args.path), pipe);
            });
        },
    };

    return plugin;
}
