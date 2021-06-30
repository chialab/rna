import path from 'path';

/**
 * Convert a file path to CamelCase.
 *
 * @param {string} file The file path.
 * @return {string}
 */
export function camelize(file) {
    const filename = path.basename(file, path.extname(file));
    return filename.replace(/(^[a-z0-9]|[-_]([a-z0-9]))/g, (g) => (g[1] || g[0]).toUpperCase());
}
