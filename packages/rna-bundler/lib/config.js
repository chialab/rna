/**
 * @typedef {Object} RnaConfig
 * @property {string} [root]
 * @property {string} [publicPath]
 * @property {string} [manifestPath]
 * @property {string} [entrypointsPath]
 * @property {boolean} [clean]
 * @property {boolean} [watch]
 */

/**
 * @typedef {Object} RnaEntrypointConfig
 * @property {string|string[]} input
 * @property {string} [output]
 * @property {string} [name]
 * @property {string} [code]
 */

/**
 * @typedef {import('esbuild').BuildOptions & RnaConfig & RnaEntrypointConfig} EntrypointConfig
 */

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
