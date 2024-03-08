import requireResolvePlugin from '@chialab/esbuild-plugin-require-resolve';
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
        '@chialab/es-dev-server',
        '@chialab/rna-config-loader',
        '@chialab/wds-plugin-hmr',
        '@chialab/wds-plugin-node-resolve',
        '@chialab/wds-plugin-rna',
        '@chialab/wds-plugin-legacy',
        'yamlparser',
        'fsevents',
    ],
    banner: {
        js: `import { dirname as __pathDirname } from 'path';
import { createRequire as __moduleCreateRequire } from 'module';
import { fileURLToPath as __fileURLToPath } from 'url';

const require = __moduleCreateRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);
`,
    },
    plugins: [requireResolvePlugin()],
});
