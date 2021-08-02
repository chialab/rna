/**
 * @type {{[ext: string]: import('@chialab/rna-config-loader').Loader}}
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

/**
 * @type {{[ext: string]: import('@chialab/rna-config-loader').Loader}}
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
};
