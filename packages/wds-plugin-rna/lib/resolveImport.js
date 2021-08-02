import path from 'path';
import { PluginSyntaxError, PluginError } from '@web/dev-server-core';
import { normalizeImportMetaUrl, browserResolve } from '@chialab/node-resolve';

/**
 * @param {string} filePath
 */
function toBrowserPath(filePath) {
    return filePath.split(path.sep).join('/');
}

const OUTSIDE_ROOT_KEY = '/__wds-outside-root__/';

/**
 * @param {string} browserPath
 */
export function isOutsideRootDir(browserPath) {
    return browserPath.startsWith(OUTSIDE_ROOT_KEY);
}

/**
 * @param {string} fullSpec
 * @param {string} importer
 * @param {string} serveDir
 * @param {{ code?: string, line?: number, column?: number }} [info]
 */
export function resolveRelativeImport(fullSpec, importer, serveDir, { code, line, column } = {}) {
    const relativePath = path.relative(serveDir, fullSpec);
    const dirUp = `..${path.sep}`;
    const lastDirUpIndex = relativePath.lastIndexOf(dirUp) + 3;
    const dirUpStrings = relativePath.substring(0, lastDirUpIndex).split(path.sep);
    if (dirUpStrings.length === 0 || dirUpStrings.some(str => !['..', ''].includes(str))) {
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
    return `/__wds-outside-root__/${dirUpStrings.length - 1}/${importPath}`;
}

/**
 * @param {string} spec
 * @param {string} importer
 * @param {string} serveDir
 * @param {{ code?: string, line?: number, column?: number }} [info]
 */
export async function resolveImport(spec, importer, serveDir, { code, line, column } = {}) {
    importer = normalizeImportMetaUrl(importer);

    const fullSpec = path.isAbsolute(spec) ? spec : await browserResolve(spec, path.dirname(importer));
    if (!fullSpec) {
        return '/__rna-empty__.js';
    }
    if (fullSpec.startsWith(serveDir)) {
        if (!importer.startsWith(serveDir)) {
            return `/${path.relative(serveDir, fullSpec)}`;
        }
        return `./${path.relative(path.dirname(importer), fullSpec)}`;
    }

    return resolveRelativeImport(fullSpec, importer, serveDir, { code, line, column });
}
