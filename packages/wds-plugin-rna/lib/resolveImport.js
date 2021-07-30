import path from 'path';
import { PluginSyntaxError, PluginError } from '@web/dev-server-core';
import { createResolver } from '@chialab/node-resolve';
import { JS_EXTENSIONS } from '@chialab/rna-bundler';

export const resolve = createResolver({
    extensions: JS_EXTENSIONS,
    conditionNames: ['default', 'module', 'import', 'browser'],
    mainFields: ['module', 'esnext', 'jsnext', 'jsnext:main', 'browser', 'main'],
});

/**
 * @param {string} filePath
 */
function toBrowserPath(filePath) {
    return filePath.split(path.sep).join('/');
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
    const fullSpec = await resolve(spec, path.dirname(importer));
    if (fullSpec.startsWith(serveDir)) {
        return `./${path.relative(path.dirname(importer), fullSpec)}`;
    }

    return resolveRelativeImport(fullSpec, importer, serveDir, { code, line, column });
}
