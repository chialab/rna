import { createDesignTokens } from './createDesignTokens.js';

/**
 * @param {string|string[]} globs
 */
export function serveDesignTokensPlugin(globs) {
    /**
     * @type {import('@chialab/es-dev-server').Plugin}
     */
    const plugin = {
        name: 'rna-storybook-design-token',

        async serve(context) {
            if (context.path === '/design-tokens.source.json') {
                const tokens = await createDesignTokens(globs);
                return {
                    body: JSON.stringify(tokens),
                };
            }
        },
    };

    return plugin;
}
