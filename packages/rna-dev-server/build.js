import esbuild from 'esbuild';

esbuild.build({
    entryPoints: ['lib/index.js'],
    outdir: 'dist',
    bundle: true,
    splitting: false,
    minify: true,
    sourcemap: true,
    format: 'esm',
    platform: 'node',
    external: [
        '@chialab/es-dev-server',
        '@chialab/rna-config-loader',
        '@chialab/rna-logger',
        '@chialab/wds-plugin-hmr-css',
        '@chialab/wds-plugin-node-resolve',
        '@chialab/wds-plugin-rna',
        '@web/dev-server-hmr',
        'yamlparser',
        'fsevents',
    ],
    banner: {
        js: 'import { createRequire } from \'module\';\nconst require = createRequire(import.meta.url);\n',
    },
});
