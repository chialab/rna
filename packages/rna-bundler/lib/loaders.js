/**
 * @type {Record<string, import('esbuild').Loader>}
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
    '.scss': 'css',
    '.sass': 'css',
    '.html': 'file',
    '.webmanifest': 'file',
};

/**
 * @type {Record<string, import('esbuild').Loader>}
 */
export const transformLoaders = {
    '.cjs': 'tsx',
    '.mjs': 'tsx',
    '.js': 'tsx',
    '.jsx': 'tsx',
    '.ts': 'ts',
    '.tsx': 'tsx',
    '.json': 'json',
    '.geojson': 'json',
    '.css': 'css',
    '.scss': 'css',
    '.sass': 'css',
};
