/**
 * Generate a map of modules available in their prebuilt version.
 * @param {string} type
 */
export function createBundleMap(type) {
    const map = {
        'react': '@chialab/storybook-prebuilt/react',
        'react-dom': '@chialab/storybook-prebuilt/react',
        'react-is': '@chialab/storybook-prebuilt/react',
        '@mdx-js/react': '@chialab/storybook-prebuilt/mdx',
        '@storybook/manager': '@chialab/storybook-prebuilt/manager',
        [`@storybook/${type}`]: `@chialab/storybook-prebuilt/${type}`,
        '@storybook/api': '@chialab/storybook-prebuilt/api',
        '@storybook/addons': '@chialab/storybook-prebuilt/addons',
        '@storybook/client-api': '@chialab/storybook-prebuilt/client-api',
        '@storybook/client-logger': '@chialab/storybook-prebuilt/client-logger',
        '@storybook/components': '@chialab/storybook-prebuilt/components',
        '@storybook/core-events': '@chialab/storybook-prebuilt/core-events',
        '@storybook/theming': '@chialab/storybook-prebuilt/theming',
        '@storybook/addon-docs': '@chialab/storybook-prebuilt/docs',
        '@storybook/addon-docs/blocks': '@chialab/storybook-prebuilt/docs',
        '@storybook/essentials/register': '@chialab/storybook-prebuilt/essentials/register',
        '@storybook/essentials': '@chialab/storybook-prebuilt/essentials',
        'storybook-design-token': '@chialab/storybook-prebuilt/storybook-design-token',
        'storybook-design-token/dist/doc-blocks.js': '@chialab/storybook-prebuilt/storybook-design-token',
        'storybook-design-token/register': '@chialab/storybook-prebuilt/storybook-design-token/register',
    };

    const resolutions = [];
    if (type === 'web-components') {
        resolutions.push('lit-html');
    }
    if (type === 'dna') {
        resolutions.push('lit-html', '@chialab/dna');
    }

    return {
        map,
        modules: Object.keys(map),
        resolutions,
    };
}
