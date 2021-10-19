import { access, readFile } from 'fs/promises';
import path from 'path';
import { getStdinInput } from '@chialab/esbuild-helpers';

/**
 * Load any unkown refrence as file.
 * @param {{ fsCheck?: boolean, shouldThrow?: (args: import('esbuild').OnLoadArgs) => boolean }} [options]
 * @return An esbuild plugin.
 */
export default function({ fsCheck = true, shouldThrow = () => true } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'any-file',
        setup(build) {
            const { loader: loaders = {} } = build.initialOptions;
            const stdin = getStdinInput(build);
            const keys = Object.keys(loaders);

            build.onLoad({ filter: /\./, namespace: 'file' }, async (args) => {
                if (keys.includes(path.extname(args.path))) {
                    return;
                }

                if (fsCheck && (!stdin || args.path !== stdin.path)) {
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
                    contents: (stdin && args.path === stdin.path) ?
                        stdin.contents :
                        await readFile(args.path),
                    loader: 'file',
                };
            });
        },
    };

    return plugin;
}
