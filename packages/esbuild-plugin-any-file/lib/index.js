import path from 'path';
import { access, readFile } from 'fs/promises';
import { useRna } from '@chialab/esbuild-rna';

/**
 * Load any unkown refrence as file.
 * @param {{ fsCheck?: boolean, shouldThrow?: boolean|((args: import('esbuild').OnLoadArgs) => boolean) }} options
 * @returns An esbuild plugin.
 */
export default function({ fsCheck = true, shouldThrow = false } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'any-file',
        setup(pluginBuild) {
            const build = useRna(plugin, pluginBuild);

            build.onLoad({ filter: /./ }, async (args) => {
                if (path.extname(args.path) in build.getLoaders()) {
                    return;
                }

                if (fsCheck) {
                    try {
                        await access(args.path);
                    } catch (err) {
                        if (typeof shouldThrow === 'function' ? shouldThrow(args) : shouldThrow) {
                            throw err;
                        }

                        return;
                    }
                }

                return {
                    contents: await readFile(args.path),
                    loader: 'file',
                };
            });
        },
    };

    return plugin;
}
