/**
 * @type {{[ext: string]: import('esbuild').Loader}}
 */
export const loaders = {
    '.cjs': 'tsx',
    '.mjs': 'tsx',
    '.js': 'tsx',
    '.jsx': 'tsx',
    '.ts': 'ts',
    '.tsx': 'tsx',
    '.json': 'json',
    '.geojson': 'json',
    '.css': 'css',
    '.html': 'file',
    '.webmanifest': 'file',
};
