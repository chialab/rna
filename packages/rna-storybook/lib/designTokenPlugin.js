import { escapeRegexBody } from '@chialab/esbuild-helpers';
import { createEmptySourcemapComment } from '@chialab/estransform';
import { createDesignTokens } from './createDesignTokens.js';
import { DESIGN_TOKENS_SCRIPT } from './entrypoints.js';

/**
 * @param {import('./createPlugins').StorybookConfig} options
 */
export function designTokenPlugin({ cssFiles }) {
    const DESIGN_TOKEN_FILTER = new RegExp(escapeRegexBody(DESIGN_TOKENS_SCRIPT));

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'storybook-design-token',
        async setup(build) {
            if (!cssFiles) {
                return;
            }

            const options = build.initialOptions;
            const { sourceRoot, absWorkingDir } = options;
            const rootDir = sourceRoot || absWorkingDir || process.cwd();

            build.onResolve({ filter: DESIGN_TOKEN_FILTER }, (args) => ({
                path: args.path,
                namespace: 'storybook-design-token',
            }));

            build.onLoad({ filter: DESIGN_TOKEN_FILTER, namespace: 'storybook-design-token' }, () => ({
                contents: `${createDesignTokens(rootDir, cssFiles)}\n${createEmptySourcemapComment()}`,
            }));
        },
    };

    return plugin;
}
