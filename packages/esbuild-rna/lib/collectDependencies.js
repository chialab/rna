import path from 'path';

/**
 * @typedef {{ [key: string]: string[] }} DependenciesMap
 */

/**
 * @type {WeakMap<import('esbuild').BuildOptions, DependenciesMap>}
 */
const BUILD_DEPENDENCIES = new WeakMap();

/**
 * Store a build dependency.
 * @param {import('esbuild').PluginBuild} build
 * @param {string} importer
 * @param {string[]} dependencies
 */
export function collectDependencies(build, importer, dependencies) {
    const map = getBuildDependencies(build);
    map[importer] = [
        ...(map[importer] || []),
        ...dependencies,
    ];

    BUILD_DEPENDENCIES.set(build.initialOptions, map);
}

/**
 * Cleanup build dependencies map.
 * @param {import('esbuild').PluginBuild} build
 */
export function getBuildDependencies(build) {
    return BUILD_DEPENDENCIES.get(build.initialOptions) || {};
}

/**
 * @param {import('esbuild').PluginBuild} build
 * @param {import('esbuild').BuildResult} result
 * @param {string} rootDir
 * @return {DependenciesMap}
 */
export function mergeDependencies(build, result, rootDir) {
    const dependencies = getBuildDependencies(build) || {};
    const { metafile } = result;
    if (!metafile) {
        return dependencies;
    }
    for (const out of Object.values(metafile.outputs)) {
        if (!out.entryPoint) {
            continue;
        }

        const entryPoint = path.resolve(rootDir, out.entryPoint);
        const list = dependencies[entryPoint] = dependencies[entryPoint] || [];
        list.push(...Object.keys(out.inputs).map((file) => path.resolve(rootDir, file)));
    }

    return dependencies;
}
