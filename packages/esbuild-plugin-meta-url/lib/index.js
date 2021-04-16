import { promises } from 'fs';
import { extname } from 'path';
import MagicString from 'magic-string';

const { readFile } = promises;

/**
 * Instantiate a plugin that converts URL references into static import
 * in order to handle assets bundling.
 * @return An esbuild plugin.
 */
export function urlPlugin() {
    const URL_REGEX = /(new\s+(?:window\.|self\.|globalThis\.)?URL\s*\()\s*['"]([^'"]*)['"]\s*\s*,\s*import\.meta\.url\s*(\))/g;

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'url',
        setup(build) {
            let options = build.initialOptions;
            let loaders = options.loader || {};
            let keys = Object.keys(loaders);
            let tsxExtensions = keys.filter((key) => loaders[key] === 'tsx');
            let tsxRegex = new RegExp(`\\.(${tsxExtensions.map((ext) => ext.replace('.', '')).join('|')})$`);

            build.onResolve({ filter: /^https?:\/\// }, args => ({ path: args.path, external: true }));

            build.onLoad({ filter: /\./, namespace: 'file' }, async ({ path }) => {
                if (keys.includes(extname(path))) {
                    return;
                }

                return {
                    contents: await readFile(path),
                    loader: 'file',
                };
            });

            build.onLoad({ filter: tsxRegex, namespace: 'file' }, async ({ path: filePath }) => {
                let contents = await readFile(filePath, 'utf-8');
                if (!contents.match(URL_REGEX)) {
                    return { contents };
                }

                let magicCode = new MagicString(contents);
                let match = URL_REGEX.exec(contents);
                while (match) {
                    let len = match[0].length;
                    let value = match[2];
                    if (keys.includes(extname(value))) {
                        match = URL_REGEX.exec(contents);
                        continue;
                    }

                    if (value[0] !== '.' && value[0] !== '/') {
                        value = `./${value}`;
                    }

                    let identifier = `_${value.replace(/[^a-zA-Z0-9]/g, '_')}`;
                    magicCode.prepend(`import ${identifier} from '${value}';`);
                    magicCode.overwrite(match.index, match.index + len, `${match[1]}${identifier}${match[3]}`);

                    match = URL_REGEX.exec(contents);
                }

                let magicMap = magicCode.generateMap({ hires: true });
                let magicUrl = `data:application/json;charset=utf-8;base64,${Buffer.from(magicMap.toString()).toString('base64')}`;

                return {
                    contents: `${magicCode.toString()}//# sourceMappingURL=${magicUrl}`,
                };
            });
        },
    };

    return plugin;
}
