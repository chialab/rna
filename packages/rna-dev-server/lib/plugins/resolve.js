import path from 'path';
import postcss from 'postcss';
import { getRequestFilePath, PluginSyntaxError, PluginError } from '@web/dev-server-core';
import { JS_EXTENSIONS } from '@chialab/rna-bundler';
import { createResolver } from '@chialab/node-resolve';
import urlRebase from '@chialab/postcss-url-rebase';

/**
 * @typedef {import('@web/dev-server-core').Plugin} Plugin
 */

/**
 * @typedef {{ source: string; context: import('@web/dev-server-core').Context; code?: string; column?: number; line?: number }} ResolveImportArgs
 */

/**
 * @param {string} url
 */
function parseUrl(url) {
    try {
        return new URL(url);
    } catch {
        return null;
    }
}

/**
 * @param {string} path
 */
function isOutsideRootDir(path) {
    return path.startsWith('/__wds-outside-root__/');
}

/**
 * @param {string} filePath
 */
function toBrowserPath(filePath) {
    return filePath.split(path.sep).join('/');
}

/**
 * @implements {Plugin}
 */
export class ResolvePlugin {
    name = 'resolve';

    /**
     * @type {string}
     */
    rootDir = '';

    resolver = createResolver({
        extensions: JS_EXTENSIONS,
        conditionNames: ['default', 'module', 'import', 'browser'],
        mainFields: ['umd:main', 'module', 'esnext', 'jsnext', 'jsnext:main', 'browser', 'main'],
    });

    /**
     * @param {import('@web/dev-server-core').ServerStartParams} args
     */
    async serverStart({ config }) {
        this.rootDir = config.rootDir;
    }

    /**
     * @param {import('@web/dev-server-core').Context} context
     */
    async transform(context) {
        if (context.response.is('css')) {
            const rootDir = this.rootDir;
            const filePath = getRequestFilePath(context.url, rootDir);
            /**
             * @type {import('postcss').ProcessOptions}
             */
            const config = {
                map: {
                    inline: true,
                },
                from: filePath,
            };

            const result = await postcss([
                urlRebase({
                    root: rootDir,
                    transform(importPath) {
                        if (importPath.includes('/__wds-outside-root__/')) {
                            return;
                        }

                        const normalizedPath = path.resolve(filePath, importPath);
                        if (normalizedPath.startsWith(rootDir)) {
                            return;
                        }

                        const relativePath = path.relative(rootDir, normalizedPath);
                        const dirUp = `..${path.sep}`;
                        const lastDirUpIndex = relativePath.lastIndexOf(dirUp) + 3;
                        const dirUpStrings = relativePath.substring(0, lastDirUpIndex).split(path.sep);
                        if (dirUpStrings.length === 0 || dirUpStrings.some(str => !['..', ''].includes(str))) {
                            throw new Error(`Unable to resolve ${importPath}`);
                        }

                        const importRelativePath = relativePath.substring(lastDirUpIndex).split(path.sep).join('/');
                        return `/__wds-outside-root__/${dirUpStrings.length - 1}/${importRelativePath}`;
                    },
                }),
            ]).process(/** @type {string} */ (context.body), config);

            return { body: result.css.toString() };
        }
    }

    /**
     * @param {ResolveImportArgs} args
     */
    async resolveImport({
        source,
        context,
        code,
        column,
        line,
    }) {
        if (!context.response.is('js')) {
            return;
        }

        if (!path.isAbsolute(source) && parseUrl(source) != null) {
            // don't resolve relative and valid urls
            return;
        }

        // file already resolved outsided root dir
        if (isOutsideRootDir(source)) {
            return;
        }

        const rootDir = this.rootDir;
        const filePath = getRequestFilePath(context.url, rootDir);
        const resolvedPath = await this.resolver(source, path.dirname(filePath));

        if (resolvedPath.startsWith(rootDir)) {
            return `./${path.relative(path.dirname(filePath), resolvedPath)}`;
        }

        const relativePath = path.relative(rootDir, resolvedPath);
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
                throw new PluginSyntaxError(errorMessage, filePath, code, column, line);
            } else {
                throw new PluginError(errorMessage);
            }
        }

        const importPath = toBrowserPath(relativePath.substring(lastDirUpIndex));
        return `/__wds-outside-root__/${dirUpStrings.length - 1}/${importPath}`;
    }
}

export function resolvePlugin() {
    return new ResolvePlugin();
}
