import path from 'path';
import nodeResolve from 'enhanced-resolve';
import isCore from 'is-core-module';

/**
 * @typedef {Object} ResolveOptions
 * @property {string[]} [extensions]
 * @property {string[]} [exportsFields]
 * @property {string[]} [mainFields]
 * @property {string[]} [aliasFields]
 * @property {string[]} [conditionNames]
 * @property {boolean} [symlinks]
 */

/**
 * A promise based node resolution library based on enhanced-resolve
 * @param {ResolveOptions} [options]
 */
export function createResolver(options = {}) {
    const resolver = nodeResolve.create({
        symlinks: false,
        ...options,
    });

    /**
     * @param {string} spec
     * @param {string} importer
     */
    const resolve = function(spec, importer) {
        importer = importer.replace(/^file:\/\//, '');
        return new Promise((resolve, reject) => resolver(
            {},
            importer,
            spec,
            {},
            /**
             * @param {Error} err
             * @param {string} data
             */
            (err, data) => (err ? reject(err) : resolve(data)))
        );
    };

    return resolve;
}

export { isCore };

export const JS_EXTENSIONS = ['.cjs', '.mjs', '.js', '.jsx', '.ts', '.tsx'];
export const JSON_EXTENSIONS = ['.json', '.geojson'];
export const CSS_EXTENSIONS = ['.css', '.scss', '.sass', '.less'];
export const HTML_EXTENSIONS = ['.html', '.htm'];

export const resolve = createResolver();

export const fileResolve = createResolver({
    exportsFields: [],
    mainFields: [],
});

export const styleResolve = createResolver({
    extensions: ['.css'],
    exportsFields: [],
    mainFields: ['style'],
});

export const browserResolve = createResolver({
    extensions: JS_EXTENSIONS,
    conditionNames: ['default', 'module', 'import', 'browser'],
    mainFields: ['module', 'esnext', 'jsnext', 'jsnext:main', 'browser', 'main'],
    aliasFields: ['browser'],
});

/**
 * @param {string} metaUrl
 * @param {string} relativePath
 */
export function resolveToImportMetaUrl(metaUrl, relativePath) {
    return path.resolve(path.dirname(normalizeImportMetaUrl(metaUrl)), relativePath);
}

/**
 * @param {string} metaUrl
 */
export function normalizeImportMetaUrl(metaUrl) {
    return metaUrl.replace('file://', '');
}
