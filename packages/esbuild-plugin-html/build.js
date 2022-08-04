import esbuild from 'esbuild';

esbuild.build({
    entryPoints: ['lib/index.js'],
    outdir: 'dist',
    bundle: true,
    splitting: false,
    minify: false,
    sourcemap: true,
    format: 'esm',
    platform: 'node',
    external: [
        '@chialab/esbuild-rna',
        '@chialab/node-resolve',
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
