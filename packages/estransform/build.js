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
    external: ['@parcel/source-map', 'oxc-parser'],
});
