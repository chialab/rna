import path from 'path';
import nodeResolve from 'enhanced-resolve';
import isCore from 'is-core-module';
import glob from 'fast-glob';
import { pkgUp } from 'pkg-up';

export { glob, pkgUp };

/**
 * @typedef {Object} ResolveOptions
 * @property {string[]} [extensions]
 * @property {string[]} [exportsFields]
 * @property {string[]} [mainFields]
 * @property {string[]} [aliasFields]
 * @property {string[]} [conditionNames]
 * @property {boolean} [symlinks]
 * @property {boolean} [preferRelative]
 */

/**
 * @typedef {(specifier: string, impporter: string) => Promise<string>} Resolver
 */

/**
 * @typedef {(specifier: string, impporter: string) => string|false} SyncResolver
 */

/**
 * A promise based node resolution method based on enhanced-resolve
 * @param {ResolveOptions} [options]
 */
export function createResolver(options = {}) {
    const resolver = nodeResolve.create({
        symlinks: false,
        ...options,
    });

    /**
     * @type {Resolver}
     */
    const resolve = async function(specifier, importer) {
        const { path, searchParams } = getSearchParams(specifier);
        importer = getBasePath(importer);
        const resolved = await new Promise((resolve, reject) => resolver(
            {},
            importer,
            path,
            {},
            /**
             * @param {Error} err
             * @param {string} data
             */
            (err, data) => (err ? reject(err) : resolve(data)))
        );

        if (!resolved) {
            return resolved;
        }

        return `${resolved}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    };

    return resolve;
}

export { isCore };

export const JS_EXTENSIONS = ['.cjs', '.mjs', '.js', '.jsx', '.ts', '.tsx'];
export const JSON_EXTENSIONS = ['.json', '.geojson'];
export const CSS_EXTENSIONS = ['.css', '.scss', '.sass', '.less'];
export const HTML_EXTENSIONS = ['.html', '.htm'];

/**
 * Check if a file is a JavaSript source.
 * @param {string} filePath
 */
export function isJs(filePath) {
    return JS_EXTENSIONS.includes(path.posix.extname(getFileName(filePath)));
}

/**
 * Check if a file is a JSON source.
 * @param {string} filePath
 */
export function isJson(filePath) {
    return JSON_EXTENSIONS.includes(path.posix.extname(getFileName(filePath)));
}

/**
 * Check if a file is a CSS source.
 * @param {string} filePath
 */
export function isCss(filePath) {
    return CSS_EXTENSIONS.includes(path.posix.extname(getFileName(filePath)));
}

/**
 * Check if a file is an HTML source.
 * @param {string} filePath
 */
export function isHtml(filePath) {
    return HTML_EXTENSIONS.includes(path.posix.extname(getFileName(filePath)));
}

/**
 * Generic node resolver.
 */
export const resolve = createResolver();

/**
 * A style specific resolver.
 * It refers to the style field in the package json.
 */
export const styleResolve = createResolver({
    extensions: ['.css'],
    exportsFields: [],
    mainFields: ['style'],
});

/**
 * A browser specific resolver.
 * It prioritizes esm resolutions and handle browser fields in the package json.
 */
export const browserResolve = createResolver({
    extensions: JS_EXTENSIONS,
    conditionNames: ['default', 'module', 'import', 'browser'],
    mainFields: ['module', 'esnext', 'jsnext', 'jsnext:main', 'browser', 'main'],
    aliasFields: ['browser'],
});

/**
 * Resolve module using the fs.
 * @param {string} specifier
 * @param {string} importer
 */
export async function fsResolve(specifier, importer) {
    return path.resolve(getBasePath(importer), specifier);
}

/**
 * Remove the file protocol from a path (the resolver cannot handle it) and search params.
 * @param {string} filePath
 */
export function getFileName(filePath) {
    filePath = filePath.replace('file://', '');
    return getSearchParams(filePath).path;
}

/**
 * Remove the file protocol from a path (the resolver cannot handle it)
 * and return the closest directory for resolution.
 * @param {string} filePath
 */
export function getBasePath(filePath) {
    filePath = getFileName(filePath);
    if (path.extname(filePath)) {
        return path.dirname(filePath);
    }
    return filePath;
}

/**
 * Check if the given path is a valid url.
 * @param {string} url
 */
export function isUrl(url) {
    try {
        return !!(new URL(url));
    } catch (err) {
        //
    }
    return false;
}

/**
 * Check if the given source is a relative url.
 * @param {string|undefined} url The source to check.
 */
export function isRelativeUrl(url) {
    return !!url && !isUrl(url) && !path.isAbsolute(url);
}

/**
 * Extract search params from a url.
 * @param {string} source The source url.
 */
export function getSearchParams(source) {
    const [path, ...chunks] = source.split('?');
    const searchParams = new URLSearchParams(chunks.join('?'));

    return {
        path,
        searchParams,
    };
}

/**
 * Append a search param to the url.
 * @param {string} source
 * @param {string} param
 * @param {string} value
 */
export function appendSearchParam(source, param, value) {
    const { path, searchParams } = getSearchParams(source);
    if (searchParams.has(param)) {
        searchParams.delete(param);
    }
    searchParams.append(param, value);
    return `${path}?${searchParams.toString()}`;
}

/**
 * Check if a search param is available in the url.
 * @param {string} source
 * @param {string} param
 */
export function hasSearchParam(source, param) {
    const { searchParams } = getSearchParams(source);
    return searchParams.has(param);
}

/**
 * Delete a search param (if available) in the url.
 * @param {string} source
 * @param {string} param
 */
export function removeSearchParam(source, param) {
    const { path, searchParams } = getSearchParams(source);
    if (searchParams.has(param)) {
        searchParams.delete(param);
    }
    searchParams.delete(param);
    const newSearch = searchParams.toString();
    return `${path}${newSearch ? `?${newSearch}` : ''}`;
}

/**
 * Get a search param (if available) in the url.
 * @param {string} source
 * @param {string} param
 */
export function getSearchParam(source, param) {
    const { searchParams } = getSearchParams(source);
    return searchParams.get(param) || null;
}

export * from './alias.js';
