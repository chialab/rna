/**
 * @import { PresetProperty } from 'storybook/internal/types';
 * @import { StorybookConfig } from './types.js';
 */
import { dnaPlugins } from '@chialab/cem-analyzer';
import { hmrPlugin } from '@chialab/vite-plugin-hmr-dna';
import remarkGfm from 'remark-gfm';
import customElementsManifestPlugin from './plugins/CustomElementsManifest.js';

/**
 * @type {PresetProperty<'core', StorybookConfig>}
 */
export const core = {
    builder: '@storybook/builder-vite',
    renderer: '@chialab/storybook-dna',
};

export const mdxLoaderOptions = {
    mdxCompileOptions: {
        remarkPlugins: ['default' in remarkGfm ? remarkGfm.default : remarkGfm],
    },
};

/**
 * @type {StorybookConfig['viteFinal']}
 */
export const viteFinal = async (config) => {
    const { mergeConfig } = await import('vite');

    return mergeConfig(config, {
        optimizeDeps: {
            include: ['@chialab/dna/jsx-runtime', '@chialab/dna/jsx-dev-runtime'],
            exclude: ['@chialab/storybook-dna'],
        },
        plugins: [
            hmrPlugin(),
            customElementsManifestPlugin({
                renderer: '@chialab/storybook-dna',
                plugins: [...dnaPlugins],
            }),
        ],
    });
};
