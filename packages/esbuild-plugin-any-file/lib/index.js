import { access, readFile } from 'fs/promises';
import path from 'path';

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
            const options = build.initialOptions;
            const { stdin, sourceRoot } = options;
            const rootDir = sourceRoot || process.cwd();
            const input = stdin ? stdin.sourcefile : undefined;
            const fullInput = input && path.resolve(rootDir, input);
            const loaders = options.loader || {};
            const keys = Object.keys(loaders);

            build.onResolve({ filter: /^https?:\/\// }, ({ path: filePath }) => ({ path: filePath, external: true }));

            build.onLoad({ filter: /\./, namespace: 'file' }, async (args) => {
                if (keys.includes(path.extname(args.path))) {
                    return;
                }

                if (fsCheck && args.path !== fullInput) {
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
                    contents: args.path === fullInput && stdin ? stdin.contents : await readFile(args.path),
                    loader: 'file',
                };
            });
        },
    };

    return plugin;
}
