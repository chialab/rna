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
        '@chialab/esbuild-plugin-html',
        '@chialab/esbuild-plugin-virtual',
        '@chialab/esbuild-rna',
        '@chialab/estransform',
        '@chialab/node-resolve',
        '@chialab/wds-plugin-rna',
        'esbuild',
        'typescript',
    ],
    banner: {
        js: `import { dirname as __pathDirname } from 'path';
import { createRequire as __moduleCreateRequire } from 'module';

const require = __moduleCreateRequire(import.meta.url);
const __filename = new URL(import.meta.url).pathname;
const __dirname = __pathDirname(__filename);
`,
    },
});
