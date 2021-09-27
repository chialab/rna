import { writeDevEntrypointsJson } from '@chialab/rna-bundler';

/**
 * @param {import('@chialab/rna-config-loader').Entrypoint[]} [entrypoints]
 * @param {string} [entrypointsPath]
 */
export function entrypointsPlugin(entrypoints = [], entrypointsPath) {
    /**
     * @type {import('@web/dev-server-core').Plugin}
     */
    const plugin = {
        name: 'rna-entrypoints',

        async serverStart(args) {
            if (entrypoints && entrypointsPath) {
                const files = entrypoints
                    .reduce((acc, { input }) => {
                        if (Array.isArray(input)) {
                            acc.push(...input);
                        } else {
                            acc.push(input);
                        }

                        return acc;
                    }, /** @type {string[]} */ ([]));

                await writeDevEntrypointsJson(
                    files,
                    entrypointsPath,
                    /** @type {import('@web/dev-server-core').DevServer} */(/** @type {unknown} */ (args)),
                    'esm'
                );
            }
        },
    };

    return plugin;
}
