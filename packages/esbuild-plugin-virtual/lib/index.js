import { useRna } from '@chialab/esbuild-rna';

/**
 * @typedef {import('@chialab/esbuild-rna').VirtualEntry[]} PluginOptions
 */

/**
 * @typedef {{ name?: string }} PluginContext
 */

let instances = 0;

export function createVirtualPlugin() {
    return virtual.bind({ name: `virtual-${instances++}` });
}

/**
 * A virtual file system for ebuild modules.
 * @this PluginContext|void
 * @param {PluginOptions} entries
 * @returns An esbuild plugin.
 */
export default function virtual(entries) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: this?.name || 'virtual',
        async setup(pluginBuild) {
            const build = useRna(pluginBuild);
            entries.forEach((entry) => build.addVirtualModule(entry));
        },
    };

    return plugin;
}
