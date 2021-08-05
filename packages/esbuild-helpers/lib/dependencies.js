/**
 * Insert dependency plugins in the build plugins list.
 * @param {import('esbuild').PluginBuild} build The current build.
 * @param {import('esbuild').Plugin} plugin The current plugin.
 * @param {import('esbuild').Plugin[]} plugins A list of required plugins .
 * @param {'before'|'after'} [mode] Where insert the missing plugin.
 */
export async function dependencies(build, plugin, plugins, mode = 'before') {
    const options = build.initialOptions;
    const installedPlugins = options.plugins = options.plugins || [];
    const missingPlugins = [];

    let last = plugin;
    for (let i = 0; i < plugins.length; i++) {
        const dependency = plugins[i];
        if (installedPlugins.find((p) => p.name === dependency.name)) {
            continue;
        }

        missingPlugins.push(dependency.name);
        await dependency.setup(build);
        const io = installedPlugins.indexOf(last);
        if (mode === 'after') {
            last = dependency;
        }
        installedPlugins.splice(mode === 'before' ? io : (io + 1), 0, dependency);
    }

    return missingPlugins;
}
