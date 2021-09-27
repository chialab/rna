import { readFile } from 'fs/promises';
import pkgUp from 'pkg-up';

/**
 * @typedef {Object} PluginOptions
 * @property {boolean|string[]} [dependencies]
 * @property {boolean|string[]} [peerDependencies]
 * @property {boolean|string[]} [optionalDependencies]
 */

/**
 * Collect or exclude module dependencies to bundle.
 * @param {PluginOptions} [options]
 * @return An esbuild plugin.
 */
export default function({ dependencies = true, peerDependencies = false, optionalDependencies = false } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'bundle-dependencies',
        async setup(build) {
            const options = build.initialOptions;
            const { sourceRoot, absWorkingDir } = options;
            const rootDir = sourceRoot || absWorkingDir || process.cwd();
            const external = [...(options.external || [])];

            const packageFile = await pkgUp({
                cwd: rootDir,
            });
            if (packageFile) {
                const packageJson = JSON.parse(await readFile(packageFile, 'utf-8'));
                if (dependencies) {
                    external.push(...(
                        dependencies === true ?
                            Object.keys(packageJson.dependencies || {}) :
                            dependencies
                    ));
                }
                if (peerDependencies) {
                    external.push(...(
                        peerDependencies === true ?
                            Object.keys(packageJson.peerDependencies || {}) :
                            peerDependencies
                    ));
                }
                if (optionalDependencies) {
                    external.push(...(
                        optionalDependencies === true ?
                            Object.keys(packageJson.optionalDependencies || {}) :
                            optionalDependencies
                    ));
                }
            }

            options.external = external;
        },
    };

    return plugin;
}
