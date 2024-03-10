import { Buffer } from 'buffer';
import path from 'path';
import metaUrlPlugin, { getHashParam } from '@chialab/esbuild-plugin-meta-url';
import { useRna } from '@chialab/esbuild-rna';
import { getLocation, parse, walk } from '@chialab/estransform';

/**
 * @typedef {{ constructors?: string[], proxy?: boolean, emit?: boolean }} PluginOptions
 */

/**
 * Create a blob proxy worker code.
 * @param {string} argument The url reference.
 * @param {import('@chialab/esbuild-rna').BuildOptions} transformOptions The transform options for the url.
 * @param {boolean} [checkType] Should check argument type.
 */
function createBlobProxy(argument, transformOptions, checkType = false) {
    const createUrlFn = `(function(path) {
    const url = new URL(path);
    url.searchParams.set('transform', '${JSON.stringify(transformOptions)}');
    return url.href;
})`;
    const blobContent =
        transformOptions.format === 'esm'
            ? `'import "' + ${createUrlFn}(${argument}) + '";'`
            : `'importScripts("' + ${createUrlFn}(${argument}) + '");'`;

    return `${
        checkType ? `typeof ${argument} !== 'string' ? ${argument} : ` : ''
    }URL.createObjectURL(new Blob([${blobContent}], { type: 'text/javascript' }))`;
}

/**
 * Instantiate a plugin that collect and builds Web Workers.
 * @param {PluginOptions} options
 * @returns An esbuild plugin.
 */
export default function ({ constructors = ['Worker', 'SharedWorker'], proxy = false, emit = true } = {}) {
    const variants = constructors.reduce(
        (acc, Ctr) => [...acc, Ctr, `window.${Ctr}`, `globalThis.${Ctr}`, `self.${Ctr}`],
        /** @type {string[]} */ ([])
    );

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'worker',
        async setup(pluginBuild) {
            const build = useRna(plugin, pluginBuild);
            const { format, bundle, sourcesContent, sourcemap } = build.getOptions();
            const workingDir = build.getWorkingDir();

            build.onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, async (args) => {
                const code = args.code;

                if (!variants.find((ctr) => code.includes(`new ${ctr}`))) {
                    return;
                }

                const { ast, helpers } = await parse(code, path.relative(workingDir, args.path));

                /**
                 * @type {import('esbuild').Message[]}
                 */
                const warnings = [];

                /**
                 * @type {string[]}
                 */
                const classDeclarations = [];

                /**
                 * @type {{ [key: string]: string }}
                 */
                const symbols = {};
                walk(ast, {
                    ClassDeclaration(node) {
                        if (!node.id || node.id.type !== 'Identifier') {
                            return;
                        }
                        classDeclarations.push(node.id.name);
                    },
                    VariableDeclarator(node) {
                        if (node.id.type === 'Identifier' && node.init && node.init.type === 'StringLiteral') {
                            symbols[node.id.name] = node.init.value;
                        }
                    },
                });

                await walk(ast, {
                    async NewExpression(node) {
                        const callee = node.callee;
                        if (callee.type !== 'Identifier' || !constructors.includes(callee.name)) {
                            if (callee.type !== 'StaticMemberExpression') {
                                return;
                            }
                            if (
                                callee.object.type !== 'Identifier' ||
                                !['window', 'globalThis', 'self', 'global'].includes(callee.object.name) ||
                                callee.property.type !== 'Identifier' ||
                                !constructors.includes(callee.property.name)
                            ) {
                                return;
                            }
                        } else if (classDeclarations.includes(callee.name)) {
                            return;
                        }

                        const argument = node.arguments[0];
                        if (!argument) {
                            return;
                        }

                        const options = node.arguments[1];

                        /**
                         * @type {import('@chialab/esbuild-rna').BuildOptions}
                         */
                        const transformOptions = {
                            format: 'iife',
                            bundle: true,
                            platform: 'neutral',
                        };

                        if (options && options.type === 'ObjectExpression') {
                            for (const property of options.properties) {
                                if (
                                    property.type === 'ObjectProperty' &&
                                    property.key.type === 'Identifier' &&
                                    property.key.name === 'type' &&
                                    property.value.type === 'StringLiteral'
                                ) {
                                    transformOptions.format = 'esm';
                                    delete transformOptions.external;
                                    delete transformOptions.bundle;
                                    break;
                                }
                            }
                        }

                        if (
                            argument.type !== 'NewExpression' ||
                            argument.callee.type !== 'Identifier' ||
                            argument.callee.name !== 'URL'
                        ) {
                            const isStringLiteral = argument.type === 'StringLiteral';
                            const isIdentifier = argument.type === 'Identifier';
                            if ((isStringLiteral || isIdentifier) && proxy) {
                                const arg = helpers.substring(argument.start, argument.end);
                                helpers.overwrite(
                                    argument.start,
                                    argument.end,
                                    createBlobProxy(arg, transformOptions, true)
                                );
                            }
                            return;
                        }

                        const reference = argument.arguments[0];
                        const originArgument = argument.arguments[1];
                        if (
                            !originArgument ||
                            originArgument.type !== 'StaticMemberExpression' ||
                            originArgument.object.type !== 'MetaProperty' ||
                            originArgument.object.meta.name !== 'import' ||
                            originArgument.object.property.name !== 'meta' ||
                            originArgument.property.type !== 'Identifier' ||
                            originArgument.property.name !== 'url'
                        ) {
                            return;
                        }

                        const isStringLiteral = reference.type === 'StringLiteral';
                        const isIdentifier = reference.type === 'Identifier';
                        if (!isStringLiteral && !isIdentifier && !proxy) {
                            return;
                        }

                        const value = isStringLiteral
                            ? reference.value
                            : isIdentifier
                              ? symbols[reference.name] || null
                              : null;

                        if (typeof value !== 'string') {
                            if (proxy) {
                                const arg = helpers.substring(argument.start, argument.end);
                                helpers.overwrite(
                                    argument.start,
                                    argument.end,
                                    createBlobProxy(arg, transformOptions, true)
                                );
                            }
                            return;
                        }

                        const id = getHashParam(value);
                        if (id && build.isEmittedPath(id)) {
                            return;
                        }

                        const { path: resolvedPath, external } = await build.resolve(value, {
                            kind: 'dynamic-import',
                            importer: args.path,
                            namespace: 'file',
                            resolveDir: path.dirname(args.path),
                            pluginData: null,
                        });

                        if (external) {
                            return;
                        }

                        if (!resolvedPath) {
                            const location = getLocation(code, argument.start);
                            warnings.push({
                                id: 'worker-reference-not-found',
                                pluginName: 'worker',
                                text: `Unable to resolve '${value}' file.`,
                                location: {
                                    file: args.path,
                                    namespace: args.namespace,
                                    ...location,
                                    length: argument.end - argument.start,
                                    lineText: code.split('\n')[location.line - 1],
                                    suggestion: '',
                                },
                                notes: [],
                                detail: '',
                            });
                            return;
                        }

                        let emittedChunk;
                        let entryPoint = resolvedPath;
                        const searchParams = new URLSearchParams();
                        if (emit) {
                            emittedChunk = await build.emitChunk(
                                {
                                    ...transformOptions,
                                    path: resolvedPath,
                                    write: format !== 'iife' || !bundle,
                                },
                                format !== 'iife' || !bundle
                            );
                            searchParams.set('hash', emittedChunk.id);
                            entryPoint = emittedChunk.path;
                        }

                        if (emittedChunk && format === 'iife' && bundle) {
                            const { outputFiles } = emittedChunk;
                            if (outputFiles) {
                                const base64 = Buffer.from(outputFiles[0].contents).toString('base64');
                                helpers.overwrite(
                                    argument.start,
                                    argument.end,
                                    `new URL('data:text/javascript;base64,${base64}')`
                                );
                            }
                        } else {
                            const outputPath = build.resolveRelativePath(entryPoint);
                            const searchParamsString = searchParams.toString();
                            const arg = `new URL('${outputPath}${
                                searchParamsString ? `?${searchParamsString}` : ''
                            }', import.meta.url).href`;
                            if (proxy) {
                                helpers.overwrite(
                                    argument.start,
                                    argument.end,
                                    createBlobProxy(arg, transformOptions, false)
                                );
                            } else {
                                helpers.overwrite(argument.start, argument.end, arg);
                            }
                        }
                    },
                });

                if (!helpers.isDirty()) {
                    return {
                        warnings,
                    };
                }

                const transformResult = await helpers.generate({
                    sourcemap: !!sourcemap,
                    sourcesContent,
                });

                return {
                    ...transformResult,
                    warnings,
                };
            });

            await build.setupPlugin([metaUrlPlugin({ emit })], 'after');
        },
    };

    return plugin;
}
