import path from 'path';
import glob from 'fast-glob';
import { pipe } from '@chialab/estransform';
import { getTransformOptions } from '@chialab/esbuild-plugin-transform';

const WEBPACK_INCLUDE_REGEX = /import\(\s*\/\*\s*webpackInclude:\s*([^\s]+)\s\*\/(?:\s*\/\*\s*webpackExclude:\s*([^\s]+)\s\*\/)?[^`]*`([^$]*)\${([^}]*)}[^`]*`\)/g;

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
        setup(build) {
            const options = build.initialOptions;
            const { filter, getEntry, buildEntry } = getTransformOptions(build);

            build.onLoad({ filter, namespace: 'file' }, async (args) => {
                const entry = await getEntry(args.path);

                if (!entry.code.match(WEBPACK_INCLUDE_REGEX)) {
                    return;
                }

                await pipe(entry, {
                    source: path.basename(args.path),
                    sourcesContent: options.sourcesContent,
                }, async (magicCode) => {
                    let match = WEBPACK_INCLUDE_REGEX.exec(entry.code);
                    while (match) {
                        const include = new RegExp(match[1].substr(1, match[1].length - 2));
                        const exclude = match[2] && new RegExp(match[2].substr(1, match[2].length - 2));
                        const initial = match[3] || './';
                        const identifier = match[4];
                        const map = (await glob(`${initial}*`, {
                            cwd: path.dirname(args.path),
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

                        match = WEBPACK_INCLUDE_REGEX.exec(entry.code);
                    }
                });

                return buildEntry(args.path);
            });
        },
    };

    return plugin;
}
