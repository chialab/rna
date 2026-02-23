import path from 'node:path';
import { createEmptyModule } from '@chialab/estransform';
import { browserResolve, getSearchParam, getSearchParams, isUrl } from '@chialab/node-resolve';
import { getRequestFilePath, PluginError, PluginSyntaxError } from '@web/dev-server-core';

/**
 * @typedef {import('@web/dev-server-core').Plugin} Plugin
 */

/**
 * The path used by WDS to identify modules outside the serve dir.
 */
export const OUTSIDE_ROOT_KEY = '/__wds-outside-root__/';

/**
 * The path used by this plugin to identify empty replacements.
 */
export const EMPTY_KEY = '/__web-dev-server__empty.js';

/**
 * Check if the given path needs to be resolved.
 * Relative and valid urls should not be resolved.
 * @param {string} url
 */
export function skipResolve(url) {
    return !path.isAbsolute(url) && isUrl(url);
}

/**
 * Web dev server helpers route prefix.
 */
export const HELPERS_PATH = '__wds-helpers__';

/**
 * Create a helper url.
 * @param {string} name The name of the helper.
 */
export function createHelperUrl(name) {
    return `/${HELPERS_PATH}/${name}`;
}

/**
 * Check if the given url is a server helper file.
 * @param {string} url
 */
export function isHelperImport(url) {
    return url.includes('__web-dev-server__') || url.includes('__web-test-runner__') || url.includes(HELPERS_PATH);
}

/**
 * Convert a fs path to its browser path.
 * @param {string} filePath
 */
export function toBrowserPath(filePath) {
    return filePath.split(path.sep).join('/');
}

/**
 * Check if the given path is outside the root dir.
 * @param {string} browserPath
 */
export function isOutsideRootDir(browserPath) {
    return browserPath.startsWith(OUTSIDE_ROOT_KEY);
}

/**
 * Check if script is loaded as plain script or module.
 * @param {import('koa').Context} context
 */
export function isPlainScript(context) {
    if (getSearchParam(context.url, 'type') === 'module') {
        return false;
    }
    const headers = context.headers;
    if (headers['accept'] !== '*/*') {
        return;
    }
    if ('sec-fetch-mode' in headers) {
        return headers['sec-fetch-mode'] === 'no-cors' && headers['sec-fetch-dest'] === 'script';
    }
    if (!context['origin']) {
        return true;
    }

    return false;
}

/**
 * Convert an absolute import reference to its browser path.
 * It uses relative paths for modules served from the root dir,
 * the /__wds-outside-root__/ endpoint otherwise.
 *
 * @param {string} specifier
 * @param {string} importer
 * @param {string} serveDir
 * @param {{ code?: string, line?: number, column?: number }} info
 */
export function resolveRelativeImport(specifier, importer, serveDir, { code, line, column } = {}) {
    const { path: importerPathname } = getSearchParams(importer);
    const { path: specifierPathname, searchParams } = getSearchParams(specifier);
    const search = searchParams.toString() ? `?${searchParams.toString()}` : '';
    if (specifierPathname.startsWith(serveDir)) {
        if (!importerPathname.startsWith(serveDir)) {
            return `/${path.relative(serveDir, specifierPathname)}${search}`;
        }
        return `./${path.relative(path.dirname(importerPathname), specifierPathname)}${search}`;
    }

    const relativePath = path.relative(serveDir, specifierPathname);
    const dirUp = `..${path.sep}`;
    const lastDirUpIndex = relativePath.lastIndexOf(dirUp) + 3;
    const dirUpStrings = relativePath.substring(0, lastDirUpIndex).split(path.sep);
    if (dirUpStrings.length === 0 || dirUpStrings.some((str) => !['..', ''].includes(str))) {
        // we expect the relative part to consist of only ../ or ..\\
        const errorMessage =
            'This path could not be converted to a browser path. Please file an issue with a reproduction.';
        if (typeof code === 'string' && typeof column === 'number' && typeof line === 'number') {
            throw new PluginSyntaxError(errorMessage, importerPathname, code, column, line);
        }
        throw new PluginError(errorMessage);
    }

    const importPath = toBrowserPath(relativePath.substring(lastDirUpIndex));
    return `${OUTSIDE_ROOT_KEY}${dirUpStrings.length - 1}/${importPath}${search}`;
}

/**
 * A resolve method for Web Dev Server.
 * @param {string} specifier
 * @param {string} importer
 * @param {string} serveDir
 * @param {{ code?: string, line?: number, column?: number }} info
 */
export async function resolveImport(specifier, importer, serveDir, { code, line, column } = {}) {
    const resolved = await browserResolve(specifier, importer);
    if (!resolved) {
        return EMPTY_KEY;
    }

    return resolveRelativeImport(resolved, importer, serveDir, { code, line, column });
}

/**
 * A plugin the Web Dev Server for node resolutions.
 * @param {{ alias?: Record<string, string> }} [config]
 */
export default function (config = {}) {
    /**
     * @type {import('@web/dev-server-core').DevServerCoreConfig}
     */
    let serverConfig;

    const aliasRegexes = new Map(
        Object.entries(config.alias || {}).map(([key, value]) => [
            new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}$`),
            { key, value },
        ])
    );

    /**
     * @type {Plugin}
     */
    const plugin = {
        name: 'node-resolve',

        async serverStart({ config }) {
            serverConfig = config;
        },

        async serve(context) {
            if (context.path.includes(EMPTY_KEY)) {
                // return an empty module
                return createEmptyModule();
            }
        },

        async resolveImport({ source, context, code, line, column }) {
            if (!context.response.is('js')) {
                return;
            }

            if (isHelperImport(source)) {
                return;
            }

            const { rootDir } = serverConfig;
            const filePath = getRequestFilePath(context.url, rootDir);

            for (const [regex, res] of aliasRegexes.entries()) {
                if (source.match(regex)) {
                    const aliased = res.value;
                    if (!aliased || aliased === 'empty') {
                        return EMPTY_KEY;
                    }

                    source = aliased;
                    break;
                }
            }

            if (skipResolve(source)) {
                return;
            }

            if (isOutsideRootDir(source)) {
                // file already resolved outsided root dir
                return;
            }

            return await resolveImport(source, filePath, rootDir, { code, line, column });
        },
    };

    return plugin;
}
