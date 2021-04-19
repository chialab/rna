declare module 'esbuild-plugin-pipe' {
    export default function(options: { plugins: import('esbuild').Plugin[] }): import('esbuild').Plugin;
}
