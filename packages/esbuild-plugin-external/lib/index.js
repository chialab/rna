import { readFile } from 'fs/promises';
import { pkgUp } from '@chialab/node-resolve';

/**
 * @typedef {Object} PluginOptions
 * @property {boolean|string[]} [dependencies]
 * @property {boolean|string[]} [peerDependencies]
 * @property {boolean|string[]} [optionalDependencies]
 */

/**
 * Collect or exclude module dependencies to bundle.
 * @param {PluginOptions} [options]
 * @returns An esbuild plugin.
 */
export default function({ dependencies = true, peerDependencies = false, optionalDependencies = false } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'external',
        async setup(build) {
            build.onResolve({ filter: /^https?:\/\// }, (args) => ({
                path: args.path,
                external: true,
            }));

            const { bundle, external = [], sourceRoot, absWorkingDir } = build.initialOptions;
            if (!bundle) {
                return;
            }

            const rootDir = sourceRoot || absWorkingDir || process.cwd();
            const packageFile = await pkgUp({
                cwd: rootDir,
            });

            if (packageFile) {
                const packageJson = JSON.parse(await readFile(packageFile, 'utf-8'));
                const collectDependencies = [];
                if (dependencies) {
                    collectDependencies.push(...(
                        dependencies === true ?
                            Object.keys(packageJson.dependencies || {}) :
                            dependencies
                    ));
                }
                if (peerDependencies) {
                    collectDependencies.push(...(
                        peerDependencies === true ?
                            Object.keys(packageJson.peerDependencies || {}) :
                            peerDependencies
                    ));
                }
                if (optionalDependencies) {
                    collectDependencies.push(...(
                        optionalDependencies === true ?
                            Object.keys(packageJson.optionalDependencies || {}) :
                            optionalDependencies
                    ));
                }

                collectDependencies.forEach((entry) => {
                    if (external.indexOf(entry) === -1) {
                        external.push(entry);
                    }
                });
            }

            build.initialOptions.external = external;
        },
    };

    return plugin;
}
