import { Build } from './Build.js';

/**
 * Create and collect build states.
 */
export class BuildManager {
    /**
     * @type {WeakMap<import('esbuild').BuildOptions, Build>}
     */
    builds = new WeakMap();

    /**
     * Create build hanlder.
     * @param {import('esbuild').PluginBuild} pluginBuild
     * @returns A build handler.
     */
    getBuild(pluginBuild) {
        const build = this.builds.get(pluginBuild.initialOptions) || new Build(pluginBuild, this);
        this.builds.set(pluginBuild.initialOptions, build);

        return build;
    }
}
