export const JS_EXTENSIONS = ['.cjs', '.mjs', '.js', '.jsx', '.ts', '.tsx'];
export const JSON_EXTENSIONS = ['.json', '.geojson'];
export const CSS_EXTENSIONS = ['.css', '.scss', '.sass', '.less'];
export const HTML_EXTENSIONS = ['.html', '.htm'];

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
