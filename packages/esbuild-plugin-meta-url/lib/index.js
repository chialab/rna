import path from 'path';
import { resolve as defaultResolve, isUrl } from '@chialab/node-resolve';
import { dependencies } from '@chialab/esbuild-helpers';
import emitPlugin, { emitFileOrChunk, getBaseUrl, prependImportStatement } from '@chialab/esbuild-plugin-emit';
import { pipe, walk, getOffsetFromLocation } from '@chialab/estransform';
import { getEntry, finalizeEntry, createFilter, getParentBuild, transformError } from '@chialab/esbuild-plugin-transform';

/**
 * @typedef {{ resolve?: typeof defaultResolve }} PluginOptions
 */

/**
 * Detect first level identifier for esbuild file loader imports.
 * File could be previously bundled using esbuild, so the first argument of a new URL(something, import.meta.url)
 * is not a literal anymore but an identifier.
 * Here, we are looking for its computed value.
 * @param {*} node The acorn node.
 * @param {string} id The name of the identifier.
 * @param {*} program The ast program.
 * @return {*} The init acorn node.
 */
export function findIdentifierValue(node, id, program) {
    const identifier = program.body
        .filter(
            /**
             * @param {*} child
             */
            (child) => child.type === 'VariableDeclaration'
        )
        .reduce(
            /**
             * @param {*[]} acc
             * @param {*} child
             */
            (acc, child) => [...acc, ...child.declarations], []
        )
        .filter(
            /**
             * @param {*} child
             */
            (child) => child.type === 'VariableDeclarator'
        )
        .find(
            /**
             * @param {*} child
             */
            (child) => child.id && child.id.type === 'Identifier' && child.id.name === id
        );

    if (!identifier || !identifier.init || identifier.init.type !== 'Literal') {
        return node;
    }

    return identifier.init;
}

/**
 * @param {*} node The acorn node.
 * @param {*} ast The ast program.
 * @return The path value.
 */
export function getMetaUrl(node, ast) {
    if (node.type === 'MemberExpression') {
        node = node.object;
    }
    if (!node.callee || node.callee.type !== 'Identifier' || node.callee.name !== 'URL') {
        return;
    }

    if (node.arguments.length !== 2) {
        return;
    }

    const arg1 = node.arguments[0].type === 'Identifier' ? findIdentifierValue(node, node.arguments[0].name, ast) : node.arguments[0];
    const arg2 = node.arguments[1];

    if (arg1.type !== 'Literal' ||
        arg2.type !== 'MemberExpression') {
        return;
    }

    if (arg2.object.type !== 'MetaProperty' ||
        arg2.property.type !== 'Identifier' ||
        arg2.property.name !== 'url') {
        return;
    }

    return arg1.value;
}

/**
 * Instantiate a plugin that converts URL references into static import
 * in order to handle assets bundling.
 * @param {PluginOptions} [options]
 * @return An esbuild plugin.
 */
export default function({ resolve = defaultResolve } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'meta-url',
        async setup(build) {
            await dependencies(getParentBuild(build) || build, plugin, [
                emitPlugin(),
            ]);

            const options = build.initialOptions;

            build.onLoad({ filter: createFilter(build), namespace: 'file' }, async (args) => {
                /**
                 * @type {import('@chialab/estransform').Pipeline}
                 */
                const entry = args.pluginData || await getEntry(build, args.path);
                if (!entry.code.includes('import.meta.url') ||
                    !entry.code.includes('URL(')) {
                    return;
                }

                try {
                    await pipe(entry, {
                        source: path.basename(args.path),
                        sourcesContent: options.sourcesContent,
                    }, async ({ magicCode, code, ast }) => {
                        /**
                         * @type {{ [key: string]: string }}
                         */
                        const ids = {};

                        /**
                         * @type {Promise<void>[]}
                         */
                        const promises = [];

                        walk(ast, {
                            /**
                             * @param {*} node
                             */
                            NewExpression(node) {
                                const value = getMetaUrl(node, ast);
                                if (typeof value !== 'string' || isUrl(value)) {
                                    return;
                                }

                                promises.push((async () => {
                                    const resolvedPath = await resolve(value, args.path);
                                    const startOffset = getOffsetFromLocation(code, node.loc.start);
                                    const endOffset = getOffsetFromLocation(code, node.loc.end);
                                    if (!ids[resolvedPath]) {
                                        const entryPoint = emitFileOrChunk(build, resolvedPath);
                                        const { identifier } = prependImportStatement({ ast, magicCode, code }, entryPoint, value);
                                        ids[resolvedPath] = identifier;
                                    }

                                    magicCode.overwrite(startOffset, endOffset, `new URL(${ids[resolvedPath]}, ${getBaseUrl(build)})`);
                                })());
                            },
                        });

                        await Promise.all(promises);
                    });
                } catch (error) {
                    throw transformError(this.name, error);
                }

                return finalizeEntry(build, args.path);
            });
        },
    };

    return plugin;
}
