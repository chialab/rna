import path from 'path';
import { escapeRegexBody } from '@chialab/node-resolve';
import { getRootDir } from '@chialab/esbuild-helpers';

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
            const rootDir = getRootDir(build);

            entries.forEach((entry) => {
                const filter = new RegExp(escapeRegexBody(entry.path));

                build.onResolve({ filter }, () => ({
                    path: path.resolve(rootDir, entry.path.replace(/^\/*/, '')),
                    namespace: 'virtual',
                }));

                build.onLoad({ filter, namespace: 'virtual' }, () => ({
                    contents: entry.contents,
                }));
            });
        },
    };

    return plugin;
}
