import { createBuildState } from './BuildState.js';

/**
 * Create and collect build states.
 */
export class BuildManager {
    /**
     * @type {WeakMap<import('esbuild').BuildOptions, import('./BuildState.js').BuildState>}
     */
    builds = new WeakMap();

    /**
     * Get or create a build state.
     * @param {import('esbuild').PluginBuild} build
     * @returns A build state.
     */
    getState(build) {
        const state = this.builds.get(build.initialOptions) || createBuildState();
        this.builds.set(build.initialOptions, state);

        return state;
    }
}
