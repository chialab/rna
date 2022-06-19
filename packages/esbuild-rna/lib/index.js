import path from 'path';
import { BuildManager } from './BuildManager.js';

export * from './Build.js';
export * from './helpers.js';

/**
 * Build manager instance.
 */
const manager = new BuildManager();

/**
 * Enrich the esbuild build with a transformation pipeline and emit methods.
 * @param {import('esbuild').PluginBuild} pluginBuild The esbuild build.
 */
export function useRna(pluginBuild) {
    const build = manager.getBuild(pluginBuild);
    const stdin = build.getOption('stdin');
    if (stdin && stdin.sourcefile) {
        const sourceFile = path.resolve(build.getSourceRoot(), stdin.sourcefile);
        build.setOption('entryPoints', [sourceFile]);
        build.deleteOption('stdin');

        build.addVirtualModule({
            path: sourceFile,
            contents: stdin.contents,
            loader: stdin.loader,
        });
    }
    return build;
}

/**
* @returns {import('esbuild').Plugin}
*/
export function rnaPlugin() {
    return {
        name: 'rna',
        setup(build) {
            useRna(build);
        },
    };
}
