import { writeDevEntrypointsJson } from '@chialab/rna-bundler';

/**
 * @param {import('@chialab/rna-config-loader').Entrypoint[]} [entrypoints]
 */
export function entrypointsPlugin(entrypoints = []) {
    /**
     * @type {import('@web/dev-server-core').Plugin}
     */
    const plugin = {
        name: 'rna-entrypoints',

        async serverStart(serverStartParams) {
            if (entrypoints) {
                await Promise.all(
                    entrypoints.map(async ({ input, entrypointsPath }) => {
                        if (!entrypointsPath) {
                            return;
                        }

                        const files = Array.isArray(input) ? input : [input];
                        await writeDevEntrypointsJson(files, entrypointsPath, serverStartParams, 'esm');
                    })
                );
            }
        },
    };

    return plugin;
}
