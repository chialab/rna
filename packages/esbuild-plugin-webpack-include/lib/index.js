import { promises } from 'fs';
import path from 'path';
import MagicString from 'magic-string';
import glob from 'fast-glob';

const { readFile } = promises;

const WEBPACK_INCLUDE_REGEX = /import\(\s*\/\*\s*webpackInclude:\s*([^\s]+)\s\*\/(?:\s*\/\*\s*webpackExclude:\s*([^\s]+)\s\*\/)?[^`]*`([^$]*)\${([^}]*)}[^`]*`\)/g;
const SCRIPT_LOADERS = ['tsx', 'ts', 'jsx', 'js'];

/**
 * @param {import('esbuild').OnLoadArgs} args
 * @param {string} contents
 * @return {Promise<import('esbuild').OnLoadResult>}
 */
async function transformWebpackIncludes({ path: filePath }, contents = '') {
    contents = contents || await readFile(filePath, 'utf-8');
    if (!contents.match(WEBPACK_INCLUDE_REGEX)) {
        return { contents, loader: 'tsx' };
    }

    let magicCode = new MagicString(contents);
    let match = WEBPACK_INCLUDE_REGEX.exec(contents);
    while (match) {
        let include = new RegExp(match[1].substr(1, match[1].length - 2));
        let exclude = match[2] && new RegExp(match[2].substr(1, match[2].length - 2));
        let initial = match[3] || './';
        let identifier = match[4];
        let map = (await glob(`${initial}*`, {
            cwd: path.dirname(filePath),
        }))
            .filter((name) => name.match(include) && (!exclude || !name.match(exclude)))
            .reduce((map, name) => {
                map[name.replace(include, '')] = `./${path.join(initial, name)}`;
                return map;
            }, /** @type {{ [key: string]: string }} */ ({}));

        magicCode.overwrite(
            match.index,
            match.index + match[0].length,
            `({ ${Object.keys(map).map((key) => `'${key}': () => import('${map[key]}')`).join(', ')} })[${identifier}]()`
        );

        match = WEBPACK_INCLUDE_REGEX.exec(contents);
    }

    let magicMap = magicCode.generateMap({ hires: true });
    let magicUrl = `data:application/json;charset=utf-8;base64,${Buffer.from(magicMap.toString()).toString('base64')}`;

    return {
        contents: `${magicCode.toString()}//# sourceMappingURL=${magicUrl}`,
        loader: 'tsx',
    };
}

/**
 * A plugin that converts the `webpackInclude` syntax.
 * @return An esbuild plugin.
 */
export default function() {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'webpack-include',
        setup(build, { transform } = { transform: null }) {
            let options = build.initialOptions;
            let loaders = options.loader || {};
            let keys = Object.keys(loaders);
            let tsxExtensions = keys.filter((key) => SCRIPT_LOADERS.includes(loaders[key]));
            let tsxRegex = new RegExp(`\\.(${tsxExtensions.map((ext) => ext.replace('.', '')).join('|')})$`);

            if (transform) {
                let { args, contents } = /** @type {{ args: import('esbuild').OnLoadArgs, contents?: string }} */ (/** @type {unknown} */ (transform));
                if (keys.includes(path.extname(args.path))) {
                    return /** @type {void} */ (/** @type {unknown} */ (transformWebpackIncludes(args, contents)));
                }

                return;
            }

            build.onLoad({ filter: tsxRegex, namespace: 'file' }, async (args) => {
                if (!keys.includes(path.extname(args.path))) {
                    return;
                }

                return transformWebpackIncludes(args);
            });
        },
    };

    return plugin;
}
