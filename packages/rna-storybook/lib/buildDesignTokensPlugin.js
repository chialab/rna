import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { useRna } from '@chialab/esbuild-rna';
import { createDesignTokens } from './createDesignTokens.js';

/**
 * @param {string|string[]} globs
 * @returns An esbuild plugin.
 */
export function buildDesignTokensPlugin(globs) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'storybook-design-tokens',
        async setup(pluginBuild) {
            const build = useRna(plugin, pluginBuild);
            const outDir = build.getOutDir() || build.getSourceRoot();

            if (!build.isChunk()) {
                build.onEnd(async () => {
                    await mkdir(outDir, { recursive: true });
                    await writeFile(path.join(outDir, 'design-tokens.source.json'), JSON.stringify(
                        await createDesignTokens(globs)
                    ));
                });
            }
        },
    };

    return plugin;
}
