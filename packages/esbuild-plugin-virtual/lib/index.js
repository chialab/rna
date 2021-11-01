import path from 'path';
import { escapeRegexBody } from '@chialab/node-resolve';
import { useRna } from '@chialab/esbuild-rna';

/**
 * @typedef {Object} VirtualEntry
 * @property {string} path
 * @property {string|Buffer} contents
 */

/**
 * @typedef {VirtualEntry[]} PluginOptions
 */

/**
 * A virtual file system for ebuild modules.
 * @param {PluginOptions} entries
 * @return An esbuild plugin.
 */
export default function(entries) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'virtual',
        async setup(build) {
            const { onResolve, onLoad, rootDir, transform } = useRna(build);

            entries.forEach((entry) => {
                const filter = new RegExp(escapeRegexBody(entry.path));

                onResolve({ filter }, () => ({
                    path: path.resolve(rootDir, entry.path.replace(/^\/*/, '')),
                    namespace: 'virtual',
                }));

                onLoad({ filter, namespace: 'virtual' }, (args) => transform({
                    ...args,
                    code: entry.contents.toString(),
                    namespace: 'file',
                }));
            });
        },
    };

    return plugin;
}
