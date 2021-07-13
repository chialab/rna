import path from 'path';
import MagicString from 'magic-string';
import { init, parse } from 'es-module-lexer';
import { createResolver } from '@chialab/node-resolve';
import { getTransformOptions } from '@chialab/esbuild-plugin-transform';

/**
 * An esbuild plugin that resolves and converts import statements using node resolution.
 * @param {import('@chialab/node-resolve').ResolveOptions} options
 * @return An esbuild plugin.
 */
export default function(options = {}) {
    const resolve = createResolver(options);

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'node-resolve',
        setup(build) {
            const { filter, getEntry, buildEntry } = getTransformOptions(build);

            build.onLoad({ filter, namespace: 'file' }, async (args) => {
                await init;

                const entry = await getEntry(args.path);
                const code = entry.code;
                const magicCode = new MagicString(code);
                const [imports, exports] = parse(code);
                await Promise.all([
                    ...imports,
                    ...exports,
                ].map(async (entry) => {
                    if (typeof entry === 'string' || !entry.n) {
                        return;
                    }
                    const entryPoint = await resolve(entry.n, path.dirname(args.path));
                    const relative = `./${path.relative(path.dirname(args.path), entryPoint)}`;
                    if (code[entry.s] === '\'' || code[entry.s] === '"') {
                        magicCode.overwrite(entry.s, entry.e, `'${relative}'`);
                    } else {
                        magicCode.overwrite(entry.s, entry.e, relative);
                    }
                }));

                return buildEntry(args.path, {
                    code: magicCode.toString(),
                    map: JSON.parse(
                        magicCode.generateMap({
                            source: args.path,
                            hires: true,
                            includeContent: true,
                        }).toString()
                    ),
                });
            });
        },
    };

    return plugin;
}
