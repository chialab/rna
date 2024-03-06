import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: 'RNA',
    description: 'Build tools for modern web modules and applications.',
    base: '/rna/',
    outDir: '../public',

    head: [['link', { rel: 'icon', href: 'https://www.chialab.it/favicon.png' }]],

    themeConfig: {
        logo: 'https://raw.githubusercontent.com/chialab/rna/main/logo.svg',

        editLink: {
            pattern: 'https://github.com/chialab/rna/edit/main/docs/:path',
            text: 'Suggest changes to this page',
        },

        // https://vitepress.dev/reference/default-theme-config
        nav: [
            {
                text: 'Home',
                link: '/',
            },
            {
                text: 'Guide',
                link: '/guide/',
            },
            {
                text: 'Chialab.io',
                link: 'https://www.chialab.io',
            },
        ],

        sidebar: [
            {
                text: 'Get started',
                link: '/guide/',
            },
            {
                text: 'Architecture',
                link: '/guide/architecture',
            },
            {
                text: 'Plugins',
                items: [
                    {
                        text: 'esbuild-plugin-any-file',
                        link: '/guide/esbuild-plugin-any-file',
                    },
                    {
                        text: 'esbuild-plugin-babel',
                        link: '/guide/esbuild-plugin-babel',
                    },
                    {
                        text: 'esbuild-plugin-commonjs',
                        link: '/guide/esbuild-plugin-commonjs',
                    },
                    {
                        text: 'esbuild-plugin-css-import',
                        link: '/guide/esbuild-plugin-css-import',
                    },
                    {
                        text: 'esbuild-plugin-env',
                        link: '/guide/esbuild-plugin-env',
                    },
                    {
                        text: 'esbuild-plugin-html',
                        link: '/guide/esbuild-plugin-html',
                    },
                    {
                        text: 'esbuild-plugin-meta-url',
                        link: '/guide/esbuild-plugin-meta-url',
                    },
                    {
                        text: 'esbuild-plugin-metadata',
                        link: '/guide/esbuild-plugin-metadata',
                    },
                    {
                        text: 'esbuild-plugin-postcss',
                        link: '/guide/esbuild-plugin-postcss',
                    },
                    {
                        text: 'esbuild-plugin-require-resolve',
                        link: '/guide/esbuild-plugin-require-resolve',
                    },
                    {
                        text: 'esbuild-plugin-virtual',
                        link: '/guide/esbuild-plugin-virtual',
                    },
                    {
                        text: 'esbuild-plugin-worker',
                        link: '/guide/esbuild-plugin-worker',
                    },
                    {
                        text: 'postcss-dart-sass',
                        link: '/guide/postcss-dart-sass',
                    },
                    {
                        text: 'postcss-url-rebase',
                        link: '/guide/postcss-url-rebase',
                    },
                    {
                        text: 'vitest-axe',
                        link: '/guide/vitest-axe',
                    },
                    {
                        text: 'vitest-provider-browserstack',
                        link: '/guide/vitest-provider-browserstack',
                    },
                    // {
                    //     text: 'Write a plugin',
                    //     link: '/guide/write-a-plugin',
                    // },
                ],
            },
            {
                text: 'CLI',
                items: [
                    {
                        text: 'JavaScript modules',
                        link: '/guide/building-javascript',
                    },
                    {
                        text: 'CSS',
                        link: '/guide/building-css',
                    },
                    {
                        text: 'Web apps',
                        link: '/guide/building-web-apps',
                    },
                    {
                        text: 'Dev server',
                        link: '/guide/dev-server',
                    },
                    {
                        text: 'Testing in the browser',
                        link: '/guide/testing-browser',
                    },
                    {
                        text: 'Testing in node',
                        link: '/guide/testing-node',
                    },
                ],
            },
            {
                text: 'Tutorials',
                items: [
                    {
                        text: 'Migrate from CRA',
                        link: '/guide/migrate-CRA',
                    },
                ],
            },
        ],

        socialLinks: [
            {
                icon: 'github',
                link: 'https://github.com/chialab/rna',
            },
        ],

        footer: {
            message: 'Released under the MIT License.',
            copyright: 'Copyright © 2023 - Chialab',
        },
    },
    lastUpdated: true,
});
