import path from 'path';
import { getRequestFilePath, PluginSyntaxError, PluginError } from '@web/dev-server-core';
import { createEmptyModule } from '@chialab/estransform';
import { browserResolve, getSearchParams, isUrl } from '@chialab/node-resolve';

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
export const HELPERS_PATH = '/__wds-helpers__/';

/**
 * Create a helper url.
 * @param {string} name The name of the helper.
 */
export function createHelperUrl(name) {
    return `${HELPERS_PATH}/${name}`;
}

/**
 * Check if the given url is a server helper file.
 * @param {string} url
 */
export function isHelperImport(url) {
    return url.includes('__web-dev-server__web-socket') ||
        url.includes('__web-test-runner__') ||
        url.includes(HELPERS_PATH);
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
 * Convert an absolute import reference to its browser path.
 * It uses relative paths for modules served from the root dir,
 * the /__wds-outside-root__/ endpoint otherwise.
 *
 * @param {string} specifier
 * @param {string} importer
 * @param {string} serveDir
 * @param {{ code?: string, line?: number, column?: number }} [info]
 */
export function resolveRelativeImport(specifier, importer, serveDir, { code, line, column } = {}) {
    const { path: importerPathname } = getSearchParams(importer);
    const { path: specifierPathname, searchParams } = getSearchParams(specifier);
    const search = searchParams.toString() ? `?${searchParams.toString()}` : '';
    importer = importerPathname;
    specifier = specifierPathname;
    if (specifier.startsWith(serveDir)) {
        if (!importer.startsWith(serveDir)) {
            return `/${path.relative(serveDir, specifier)}${search}`;
        }
        return `./${path.relative(path.dirname(importer), specifier)}${search}`;
    }

    const relativePath = path.relative(serveDir, specifier);
    const dirUp = `..${path.sep}`;
    const lastDirUpIndex = relativePath.lastIndexOf(dirUp) + 3;
    const dirUpStrings = relativePath.substring(0, lastDirUpIndex).split(path.sep);
    if (dirUpStrings.length === 0 || dirUpStrings.some((str) => !['..', ''].includes(str))) {
        // we expect the relative part to consist of only ../ or ..\\
        const errorMessage = 'This path could not be converted to a browser path. Please file an issue with a reproduction.';
        if (
            typeof code === 'string' &&
            typeof column === 'number' &&
            typeof line === 'number'
        ) {
            throw new PluginSyntaxError(errorMessage, importer, code, column, line);
        } else {
            throw new PluginError(errorMessage);
        }
    }

    const importPath = toBrowserPath(relativePath.substring(lastDirUpIndex));
    return `${OUTSIDE_ROOT_KEY}${dirUpStrings.length - 1}/${importPath}${search}`;
}

/**
 * A resolve method for Web Dev Server.
 * @param {string} specifier
 * @param {string} importer
 * @param {string} serveDir
 * @param {{ code?: string, line?: number, column?: number }} [info]
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
 * @param {{ alias?: { [key: string]: string|false } }} [config]
 */
export default function(config = {}) {
    /**
     * @type {import('@web/dev-server-core').DevServerCoreConfig}
     */
    let serverConfig;

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

            const alias = config.alias || {};
            if (source in alias) {
                const aliased = alias[source];
                if (!aliased) {
                    return EMPTY_KEY;
                }
                source = aliased;
            }

            if (skipResolve(source)) {
                return;
            }

            if (isOutsideRootDir(source)) {
                // file already resolved outsided root dir
                return;
            }

            const { rootDir } = serverConfig;
            const filePath = getRequestFilePath(context.url, rootDir);
            return await resolveImport(source, filePath, rootDir, { code, line, column });
        },
    };

    return plugin;
}
