import path from 'path';
import { access, readFile } from 'fs/promises';
import { useRna } from '@chialab/esbuild-rna';

/**
 * Load any unkown refrence as file.
 * @param {{ fsCheck?: boolean, shouldThrow?: (args: import('esbuild').OnLoadArgs) => boolean }} [options]
 * @return An esbuild plugin.
 */
export default function({ fsCheck = true, shouldThrow = () => false } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'any-file',
        setup(build) {
            const { loader: loaders = {} } = build.initialOptions;
            const { onLoad } = useRna(build);
            const keys = Object.keys(loaders);

            onLoad({ filter: /\./ }, async (args) => {
                if (keys.includes(path.extname(args.path))) {
                    return;
                }

                if (fsCheck) {
                    try {
                        await access(args.path);
                    } catch (err) {
                        if (shouldThrow(args)) {
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
