import esbuild from 'esbuild';
import requireResolvePlugin from '@chialab/esbuild-plugin-require-resolve';

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
        '@chialab/wds-plugin-legacy',
        'yamlparser',
        'fsevents',
    ],
    banner: {
        js: `import { dirname as __pathDirname } from 'path';
import { createRequire as __moduleCreateRequire } from 'module';

const require = __moduleCreateRequire(import.meta.url);
const __filename = new URL(import.meta.url).pathname;
const __dirname = __pathDirname(__filename);
`,
    },
    plugins: [
        requireResolvePlugin(),
    ],
});
