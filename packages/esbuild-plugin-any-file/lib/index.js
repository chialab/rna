import { readFile } from 'fs/promises';
import path from 'path';

/**
 * Load any unkown refrence as file.
 * @return An esbuild plugin.
 */
export default function() {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'any-file',
        setup(build) {
            const options = build.initialOptions;
            const loaders = options.loader || {};
            const keys = Object.keys(loaders);

            build.onResolve({ filter: /^https?:\/\// }, ({ path: filePath }) => ({ path: filePath, external: true }));
            build.onLoad({ filter: /\./, namespace: 'file' }, async (args) => {
                if (keys.includes(path.extname(args.path))) {
                    return;
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
