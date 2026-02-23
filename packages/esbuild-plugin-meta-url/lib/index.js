import { Buffer } from 'node:buffer';
import { lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { useRna } from '@chialab/esbuild-rna';
import { getLocation, parse, walk } from '@chialab/estransform';
import mime from 'mime-types';

/**
 * Check if the given path is a valid url.
 * @param {string} url
 */
function isUrl(url) {
    try {
        return !!new URL(url);
    } catch {
        //
    }
    return false;
}

/**
 * Get hash param (if available) in the url.
 * @param {string} source
 */
export function getHashParam(source) {
    return new URLSearchParams(source.split('?').slice(1).join('?')).get('hash') || null;
}

/**
 * @typedef {{ emit?: boolean }} PluginOptions
 */

/**
 * Instantiate a plugin that converts URL references into static import
 * in order to handle assets bundling.
 * @param {PluginOptions} options
 * @returns An esbuild plugin.
 */
export default function ({ emit = true } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'meta-url',
        async setup(pluginBuild) {
            const build = useRna(plugin, pluginBuild);
            const { platform, bundle, format, sourcesContent, sourcemap } = build.getOptions();
            const workingDir = build.getWorkingDir();

            const usePlainScript = platform === 'browser' && (format === 'iife' ? !bundle : format !== 'esm');
            const isNode = platform === 'node' && format !== 'esm';
            const baseUrl = (() => {
                if (usePlainScript) {
                    return '__currentScriptUrl__';
                }

                if (isNode) {
                    return "'file://' + __filename";
                }

                return 'import.meta.url';
            })();

            build.onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, async (args) => {
                const code = args.code;

                if (!code.includes('import.meta.url') || !code.includes('URL(')) {
                    return;
                }

                const { ast, helpers } = await parse(code, path.relative(workingDir, args.path));

                /**
                 * @type {import('esbuild').Message[]}
                 */
                const warnings = [];

                /**
                 * @type {{ [key: string]: string }}
                 */
                const symbols = {};
                walk(ast, {
                    VariableDeclarator(node) {
                        if (node.id.type === 'Identifier' && node.init && node.init.type === 'StringLiteral') {
                            symbols[node.id.name] = node.init.value;
                        }
                    },
                });

                await walk(ast, {
                    async NewExpression(node) {
                        const callee = node.callee;
                        if (callee.type !== 'Identifier' || callee.name !== 'URL') {
                            if (callee.type !== 'StaticMemberExpression') {
                                return;
                            }
                            if (
                                callee.object.type !== 'Identifier' ||
                                !['window', 'globalThis', 'self', 'global'].includes(callee.object.name)
                            ) {
                                return;
                            }
                            if (callee.property.type !== 'Identifier' || callee.property.name !== 'URL') {
                                return;
                            }
                        }

                        const argument = node.arguments[0];
                        const originArgument = node.arguments[1];
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

                        const value =
                            argument.type === 'StringLiteral'
                                ? argument.value
                                : argument.type === 'Identifier'
                                  ? symbols[argument.name]
                                  : null;

                        if (!value || isUrl(argument.value)) {
                            return;
                        }

                        const id = getHashParam(value);
                        if (id && build.isEmittedPath(id)) {
                            return;
                        }

                        const requestName = value.split('?')[0];
                        let resolvedPath;
                        if (requestName.startsWith('./') || requestName.startsWith('../')) {
                            try {
                                const resolved = fileURLToPath(new URL(requestName, pathToFileURL(args.path)));
                                const stat = await lstat(resolved);
                                if (stat.isDirectory()) {
                                    // ignore directories
                                    return;
                                }
                                resolvedPath = resolved;
                            } catch {
                                // unable to access file
                            }
                        } else {
                            const resolved = await build.resolve(`./${requestName}`, {
                                kind: 'dynamic-import',
                                importer: args.path,
                                namespace: 'file',
                                resolveDir: path.dirname(args.path),
                                pluginData: null,
                            });
                            resolvedPath = resolved.path;
                        }

                        if (resolvedPath) {
                            const entryLoader = build.getLoader(resolvedPath) || 'file';
                            const isChunk = entryLoader !== 'file' && entryLoader !== 'json';
                            const isIIFE = format === 'iife' && bundle;
                            const searchParams = new URLSearchParams();

                            let entryPoint = resolvedPath;
                            if (emit && !isIIFE) {
                                if (isChunk) {
                                    const chunk = await build.emitChunk({ path: resolvedPath });
                                    searchParams.set('hash', chunk.id);
                                    entryPoint = chunk.path;
                                } else {
                                    const file = await build.emitFile(resolvedPath);
                                    searchParams.set('hash', file.id);
                                    entryPoint = file.path;
                                }
                            }

                            if (isIIFE) {
                                let buffer;
                                let mimeType;
                                if (isChunk) {
                                    const { outputFiles } = await build.emitChunk(
                                        {
                                            path: `./${path.relative(workingDir, resolvedPath)}`,
                                            write: false,
                                        },
                                        false
                                    );
                                    if (outputFiles) {
                                        mimeType = mime.lookup(outputFiles[0].path);
                                        buffer = Buffer.from(outputFiles[0].contents);
                                    }
                                } else {
                                    const result = await build.load({
                                        pluginData: null,
                                        namespace: 'file',
                                        suffix: '',
                                        path: resolvedPath,
                                        with: {},
                                    });

                                    if (result?.contents) {
                                        mimeType = mime.lookup(resolvedPath);
                                        buffer = Buffer.from(result.contents);
                                    }
                                }

                                if (buffer) {
                                    helpers.overwrite(
                                        node.start,
                                        node.end,
                                        `new URL('data:${mimeType};base64,${buffer.toString('base64')}')`
                                    );
                                    return;
                                }
                            }

                            const outputPath = build.resolveRelativePath(entryPoint);
                            const searchParamsString = searchParams.toString();
                            helpers.overwrite(
                                node.start,
                                node.end,
                                `new URL('${outputPath}${
                                    searchParamsString ? `?${searchParamsString}` : ''
                                }', ${baseUrl})`
                            );
                            return;
                        }

                        const location = getLocation(code, node.start);
                        warnings.push({
                            id: 'import-meta-reference-not-found',
                            pluginName: 'meta-url',
                            text: `Unable to resolve '${requestName}' file.`,
                            location: {
                                file: args.path,
                                namespace: args.namespace,
                                ...location,
                                length: node.end - node.start,
                                lineText: code.split('\n')[location.line - 1],
                                suggestion: '',
                            },
                            notes: [],
                            detail: '',
                        });
                    },
                });

                if (!helpers.isDirty()) {
                    return {
                        warnings,
                    };
                }

                if (usePlainScript) {
                    helpers.prepend(
                        'var __currentScriptUrl__ = document.currentScript && document.currentScript.src || document.baseURI;\n'
                    );
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
        },
    };

    return plugin;
}
