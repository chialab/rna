import { promises } from 'fs';
import path from 'path';
import MagicString from 'magic-string';
import nodeResolve from 'resolve';

const { readFile } = promises;

const RESOLVE_REGEX = /(require\.resolve\s*\()\s*['"]([^'"]*)['"]\s*\s*(\))/g;
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
 * @param {{ code?: string }} cache
 * @param {boolean} pipe
 * @return {Promise<import('esbuild').OnLoadResult|undefined>}
 */
async function transformUrls({ path: filePath }, cache, pipe) {
    let contents = cache.code || await readFile(filePath, 'utf-8');
    if (!contents.match(RESOLVE_REGEX)) {
        if (pipe) {
            cache.code = contents;
            return;
        }
        return {
            contents,
            loader: 'tsx',
        };
    }

    let magicCode = new MagicString(contents);
    let match = RESOLVE_REGEX.exec(contents);
    while (match) {
        let len = match[0].length;
        let value = match[2];

        let entryPoint = await resolve(value, filePath);
        let identifier = `_${value.replace(/[^a-zA-Z0-9]/g, '_')}`;
        if (contents.startsWith('#!')) {
            magicCode.appendRight(contents.indexOf('\n') + 1, `var ${identifier} = require('${entryPoint}.requirefile');\n`);
        } else {
            magicCode.prepend(`var ${identifier} = require('${entryPoint}.requirefile');\n`);
        }
        magicCode.overwrite(match.index, match.index + len, `${match[1]}${identifier}${match[3]}`);

        match = RESOLVE_REGEX.exec(contents);
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
export default function({ pipe = false, cache = new Map() } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'require-resolve',
        setup(build) {
            let options = build.initialOptions;
            let loaders = options.loader || {};
            let keys = Object.keys(loaders);
            let tsxExtensions = keys.filter((key) => SCRIPT_LOADERS.includes(loaders[key]));
            let tsxRegex = new RegExp(`\\.(${tsxExtensions.map((ext) => ext.replace('.', '')).join('|')})$`);

            build.onResolve({ filter: /\.requirefile$/ }, async ({ path: filePath }) => ({
                path: filePath.replace(/\.requirefile$/, ''),
                namespace: 'require-resolve',
            }));
            build.onLoad({ filter: /\./, namespace: 'require-resolve' }, async ({ path: filePath }) => ({
                contents: await readFile(filePath),
                loader: 'file',
            }));
            build.onLoad({ filter: tsxRegex, namespace: 'file' }, (args) => {
                cache.set(args.path, cache.get(args.path) || {});
                return transformUrls(args, cache.get(args.path), pipe);
            });
        },
    };

    return plugin;
}
