import path from 'path';
import { isUrl, hasSearchParam } from '@chialab/node-resolve';
import { MagicString, getSpanLocation, parse, walk } from '@chialab/estransform';
import { useRna } from '@chialab/esbuild-rna';

/**
 * Detect first level identifier for esbuild file loader imports.
 * File could be previously bundled using esbuild, so the first argument of a new URL(something, import.meta.url)
 * is not a literal anymore but an identifier.
 * Here, we are looking for its computed value.
 * @param {string} id The name of the identifier.
 * @param {import('@chialab/estransform').Program} program The ast program.
 * @return {import('@chialab/estransform').StringLiteral|undefined} The init ast node.
 */
export function findIdentifierValue(id, program) {
    const declarations = /** @type {import('@swc/core').VariableDeclaration[]} */ (program.body
        .filter(
            /**
             * @param {import('@swc/core').Node} child
             */
            (child) => child.type === 'VariableDeclaration'
        ));

    const declarators = declarations
        .reduce(
            /**
             * @param {import('@swc/core').VariableDeclarator[]} acc
             * @param {import('@swc/core').VariableDeclaration} child
             */
            (acc, child) => [...acc, ...child.declarations],
            /** @type {import('@swc/core').VariableDeclarator[]} */([])
        )
        .filter(
            /**
             * @param {import('@swc/core').VariableDeclarator} child
             */
            (child) => child.type === 'VariableDeclarator'
        );

    const declarator = declarators
        .find(
            /**
             * @param {import('@swc/core').VariableDeclarator} child
             */
            (child) => child.id && child.id.type === 'Identifier' && child.id.value === id
        );

    if (!declarator || !declarator.init || declarator.init.type !== 'StringLiteral') {
        return;
    }

    return declarator.init;
}

/**
 * @param {import('@chialab/estransform').NewExpression|import('@chialab/estransform').MemberExpression} node The ast node.
 * @param {import('@chialab/estransform').Program} ast The ast program.
 * @return The path value.
 */
export function getMetaUrl(node, ast) {
    const callExp = /** @type {import('@chialab/estransform').CallExpression} */ (node.type === 'MemberExpression' ? node.object : node);
    if (callExp.type !== 'CallExpression' && !callExp.callee || callExp.callee.type !== 'Identifier' || callExp.callee.value !== 'URL') {
        return;
    }

    if (callExp.arguments.length !== 2) {
        return;
    }

    const firstArgExp = callExp.arguments[0] && callExp.arguments[0].expression;
    const arg1 = firstArgExp.type === 'Identifier' && findIdentifierValue(firstArgExp.value, ast) || firstArgExp;
    const arg2 = callExp.arguments[1] && callExp.arguments[1].expression;

    if (arg1.type !== 'StringLiteral' ||
        arg2.type !== 'MemberExpression') {
        return;
    }

    if (arg2.object.type !== 'MetaProperty' ||
        arg2.property.type !== 'Identifier' ||
        arg2.property.value !== 'url') {
        return;
    }

    return arg1.value;
}

/**
 * @typedef {{ emit?: boolean }} PluginOptions
 */

/**
 * Instantiate a plugin that converts URL references into static import
 * in order to handle assets bundling.
 * @param {PluginOptions} options
 * @return An esbuild plugin.
 */
export default function({ emit = true } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'meta-url',
        async setup(build) {
            const { platform, format, sourcesContent } = build.initialOptions;
            const { onTransform, resolve, emitFile, emitChunk, rootDir, loaders: buildLoaders } = useRna(build);

            const baseUrl = (() => {
                if (platform === 'browser' && format !== 'esm') {
                    return 'document.currentScript && document.currentScript.src || document.baseURI';
                }

                if (platform === 'node' && format !== 'esm') {
                    return '\'file://\' + __filename';
                }

                return 'import.meta.url';
            })();

            onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, async (args) => {
                const code = args.code.toString();

                if (!code.includes('import.meta.url') ||
                    !code.includes('URL(')) {
                    return;
                }

                /**
                 * @type {MagicString|undefined}
                 */
                let magicCode;

                /**
                 * @type {Promise<void>[]}
                 */
                const promises = [];

                const ast = await parse(code);
                walk(ast, {
                    /**
                     * @param {import('@chialab/estransform').NewExpression} node
                     */
                    NewExpression(node) {
                        const value = getMetaUrl(node, ast);
                        if (typeof value !== 'string' || isUrl(value)) {
                            return;
                        }

                        if (hasSearchParam(value, 'emit')) {
                            // already emitted
                            const loc = getSpanLocation(ast, node);
                            magicCode = magicCode || new MagicString(code);
                            magicCode.overwrite(loc.start, loc.end, `new URL('${value}', ${baseUrl})`);
                            return;
                        }

                        promises.push(Promise.resolve().then(async () => {
                            const { path: resolvedPath } = await resolve({
                                kind: 'dynamic-import',
                                path: value.split('?')[0],
                                importer: args.path,
                                namespace: 'file',
                                resolveDir: rootDir,
                                pluginData: null,
                            });

                            if (!resolvedPath) {
                                return;
                            }

                            const loc = getSpanLocation(ast, node);
                            magicCode = magicCode || new MagicString(code);

                            const entryLoader = buildLoaders[path.extname(resolvedPath)] || 'file';
                            const entryPoint = emit ?
                                (entryLoader !== 'file' ? await emitChunk({ entryPoint: resolvedPath }) : await emitFile(resolvedPath)).path :
                                resolvedPath;

                            magicCode.overwrite(loc.start, loc.end, `new URL('${entryPoint}', ${baseUrl})`);
                        }));
                    },
                });

                await Promise.all(promises);

                if (!magicCode) {
                    return;
                }

                return {
                    code: magicCode.toString(),
                    map: magicCode.generateMap({
                        source: args.path,
                        includeContent: sourcesContent,
                        hires: true,
                    }),
                };
            });
        },
    };

    return plugin;
}
