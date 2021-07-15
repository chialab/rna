import path from 'path';
import { init, parse } from 'es-module-lexer';
import { createResolver, isCore } from '@chialab/node-resolve';
import { pipe, TARGETS, createTypeScriptTransform } from '@chialab/estransform';
import { getTransformOptions } from '@chialab/esbuild-plugin-transform';

/**
 * An esbuild plugin that resolves and converts import statements using node resolution.
 * @param {import('@chialab/node-resolve').ResolveOptions} opts
 * @return An esbuild plugin.
 */
export default function(opts = {}) {
    const resolve = createResolver(opts);

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'node-resolve',
        setup(build) {
            const options = build.initialOptions;
            const { filter, getEntry, buildEntry } = getTransformOptions(build);

            build.onLoad({ filter, namespace: 'file' }, async (args) => {
                await init;

                const entry = await getEntry(args.path);

                if (entry.target === TARGETS.typescript) {
                    await pipe(entry, {
                        source: path.basename(args.path),
                        sourcesContent: options.sourcesContent,
                    }, createTypeScriptTransform({
                        loader: entry.loader,
                        jsxFactory: options.jsxFactory,
                        jsxFragment: options.jsxFragment,
                    }));
                }

                await pipe(entry, {
                    source: path.basename(args.path),
                    sourcesContent: options.sourcesContent,
                }, async (magicCode, code) => {
                    const [imports, exports] = parse(code);

                    await Promise.all([
                        ...imports,
                        ...exports,
                    ].map(async (entry) => {
                        if (typeof entry === 'string' || !entry.n) {
                            return;
                        }
                        if (entry.n[0] === '/' ||
                            entry.n[0].startsWith('http:') ||
                            entry.n[0].startsWith('https:')) {
                            return;
                        }
                        if (isCore(entry.n)) {
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
                });

                return buildEntry(args.path);
            });
        },
    };

    return plugin;
}
