/**
 * @typedef {{ [key: string]: string[] }} DependenciesMap
 */

/**
 * @type {WeakMap<import('esbuild').BuildOptions, DependenciesMap>}
 */
const BUILD_DEPENDENCIES = new WeakMap();

/**
 * @type {WeakMap<import('esbuild').BuildResult, DependenciesMap>}
 */
const RESULT_DEPENDENCIES = new WeakMap();

/**
 * Store a build dependency.
 * @param {import('esbuild').PluginBuild} build
 * @param {string} importer
 * @param {string[]} dependencies
 */
export function addBuildDependencies(build, importer, dependencies) {
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
 * Cleanup build dependencies map.
 * @param {import('esbuild').PluginBuild} build
 */
export function flushBuildDependencies(build) {
    const map = getBuildDependencies(build);
    BUILD_DEPENDENCIES.delete(build.initialOptions);

    return map;
}

/**
 * @param {import('esbuild').BuildResult} result
 */
export function getResultDependencies(result) {
    return RESULT_DEPENDENCIES.get(result);
}

/**
 * A plugin for esbuild that collect dependencies of inner build.
 * @return An esbuild plugin.
 */
export default function() {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'alias',
        async setup(build) {
            build.onEnd((result) => {
                const dependencies = flushBuildDependencies(build);
                RESULT_DEPENDENCIES.set(result, dependencies);
            });
        },
    };

    return plugin;
}

