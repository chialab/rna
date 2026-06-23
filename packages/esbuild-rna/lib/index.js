import { BuildManager } from './BuildManager.js';

export * from './Build.js';
export * from './helpers.js';

/**
 * Build manager instance.
 */
const manager = new BuildManager();

/**
 * @typedef {import('./Build').Build & { pluginName: string }} PluginBuild
 */

/**
 * Enrich the esbuild build with a transformation pipeline and emit methods.
 * @param {import('esbuild').Plugin} pluginInstance The esbuild plugin instance.
 * @param {import('esbuild').PluginBuild} pluginBuild The esbuild build.
 */
export function useRna(pluginInstance, pluginBuild) {
    const build = manager.getBuild(pluginBuild);
    const stdin = build.getOption('stdin');
    if (stdin?.sourcefile) {
        const sourceFile = build.resolveSourcePath(stdin.sourcefile);
        build.setOption('entryPoints', [sourceFile]);
        build.deleteOption('stdin');

        build.addVirtualModule({
            path: sourceFile,
            contents: stdin.contents,
            loader: stdin.loader,
        });
    }

    const extendedBuild = /** @type {import('./Build.js').Build} */ (Object.create(build));
    extendedBuild.plugin = pluginInstance;
    extendedBuild.pluginName = pluginInstance.name;
    return extendedBuild;
}

/**
 * Wrap an esbuild plugin to provide the rna build instance in the setup function.
 * @param {import('esbuild').Plugin} plugin
 * @returns {import('esbuild').Plugin}
 */
export function wrapPlugin(plugin) {
    return {
        name: plugin.name,
        setup(build) {
            const rna = useRna(plugin, build);
            plugin.setup({
                esbuild: rna.esbuild,
                initialOptions: rna.initialOptions,
                resolve: rna.resolve.bind(rna),
                onStart: rna.onStart.bind(rna),
                onEnd: rna.onEnd.bind(rna),
                onResolve: rna.onResolve.bind(rna),
                onLoad: rna.onTransform.bind(rna),
                onDispose: rna.onDispose.bind(rna),
            });
        },
    };
}

/**
 * @returns {import('esbuild').Plugin}
 */
export function rnaPlugin() {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'rna',
        setup(build) {
            useRna(plugin, build);
        },
    };

    return plugin;
}
