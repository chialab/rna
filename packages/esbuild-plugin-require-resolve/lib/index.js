import { promises } from 'fs';
import path from 'path';
import { resolve } from '@chialab/node-resolve';
import { pipe } from '@chialab/estransform';
import { getEntry, finalizeEntry, createFilter } from '@chialab/esbuild-plugin-transform';

/**
 * Instantiate a plugin that converts URL references into static import
 * in order to handle assets bundling.
 * @return An esbuild plugin.
 */
export default function() {
    const { readFile } = promises;
    const RESOLVE_REGEX = /(require\.resolve\s*\()\s*['"]([^'"]*)['"]\s*\s*(\))/g;

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'require-resolve',
        setup(build) {
            const options = build.initialOptions;

            build.onResolve({ filter: /\.requirefile$/ }, async ({ path: filePath }) => ({
                path: filePath.replace(/\.requirefile$/, ''),
                namespace: 'require-resolve',
            }));
            build.onLoad({ filter: /\./, namespace: 'require-resolve' }, async ({ path: filePath }) => ({
                contents: await readFile(filePath),
                loader: 'file',
            }));
            build.onLoad({ filter: createFilter(build), namespace: 'file' }, (args) => {
                /**
                 * @type {import('@chialab/estransform').Pipeline}
                 */
                const entry = args.pluginData;
                if (entry && !entry.code.match(RESOLVE_REGEX)) {
                    return;
                }

                return getEntry(build, args.path)
                    .then(async (entry) => {
                        if (!entry.code.match(RESOLVE_REGEX)) {
                            return;
                        }

                        await pipe(entry, {
                            source: path.basename(args.path),
                            sourcesContent: options.sourcesContent,
                        }, async (magicCode) => {
                            let match = RESOLVE_REGEX.exec(entry.code);
                            while (match) {
                                const len = match[0].length;
                                const value = match[2];

                                const entryPoint = await resolve(value, path.dirname(args.path));
                                const identifier = `_${value.replace(/[^a-zA-Z0-9]/g, '_')}`;
                                if (entry.code.startsWith('#!')) {
                                    magicCode.appendRight(entry.code.indexOf('\n') + 1, `var ${identifier} = require('${entryPoint}.requirefile');\n`);
                                } else {
                                    magicCode.prepend(`var ${identifier} = require('${entryPoint}.requirefile');\n`);
                                }
                                magicCode.overwrite(match.index, match.index + len, `${match[1]}${identifier}${match[3]}`);

                                match = RESOLVE_REGEX.exec(entry.code);
                            }
                        });

                        return finalizeEntry(build, args.path);
                    });
            });
        },
    };

    return plugin;
}
