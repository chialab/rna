import path from 'path';
import { escapeRegexBody } from '@chialab/node-resolve';
import { useRna } from '@chialab/esbuild-rna';

/**
 * @typedef {Object} VirtualEntry
 * @property {string} path
 * @property {string|Buffer} contents
 * @property {import('esbuild').Loader} [loader]
 * @property {string} [resolveDir]
 */

/**
 * @typedef {VirtualEntry[]} PluginOptions
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
 * @this PluginContext
 * @param {PluginOptions} entries
 * @return An esbuild plugin.
 */
export default function virtual(entries) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: this?.name || 'virtual',
        async setup(build) {
            const loaders = build.initialOptions.loader || {};
            const { onResolve, onLoad, rootDir } = useRna(build);

            entries.forEach((entry) => {
                const resolveDir = entry.resolveDir || rootDir;
                const virtualFilePath = path.join(resolveDir, entry.path);
                const filter = new RegExp(escapeRegexBody(entry.path));
                const entryFilter = new RegExp(escapeRegexBody(virtualFilePath));

                onResolve({ filter }, () => ({
                    path: virtualFilePath,
                    namespace: 'file',
                }));

                onLoad({ filter: entryFilter }, (args) => ({
                    ...args,
                    contents: entry.contents,
                    namespace: 'file',
                    loader: entry.loader || loaders[path.extname(args.path)] || 'file',
                    resolveDir,
                }));
            });
        },
    };

    return plugin;
}
