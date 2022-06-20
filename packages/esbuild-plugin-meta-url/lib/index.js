import path from 'path';
import { appendSearchParam, getSearchParam, isUrl } from '@chialab/node-resolve';
import { parse, walk, getIdentifierValue, getBlock, getLocation, TokenType } from '@chialab/estransform';
import { Build, useRna } from '@chialab/esbuild-rna';

/**
 * @param {import('@chialab/estransform').TokenProcessor} processor Token processor.
 * @returns {string|undefined} The path value.
 */
export function getMetaUrl(processor) {
    let fnToken;
    let iterator = processor.currentIndex();
    if (processor.matches5(TokenType._new, TokenType.name, TokenType.dot, TokenType.name, TokenType.parenL)) {
        fnToken = processor.tokenAtRelativeIndex(2);
        iterator += 3;
    } else if (processor.matches3(TokenType._new, TokenType.name, TokenType.parenL)) {
        fnToken = processor.tokenAtRelativeIndex(1);
        iterator += 2;
    }

    if (!fnToken || processor.identifierNameForToken(fnToken) !== 'URL') {
        return;
    }

    const args = [];
    let currentArg = [];
    let currentToken = processor.tokens[++iterator];
    while (currentToken && currentToken.type !== TokenType.parenR) {
        if (currentToken.type === TokenType.comma) {
            if (!currentArg.length) {
                return;
            }

            args.push(currentArg);
            currentArg = [];

            currentToken = processor.tokens[++iterator];
            continue;
        }

        if (args.length === 0) {
            // as first argument we accept a string or a member expression
            if (currentToken.type !== TokenType.string
                && currentToken.type !== TokenType.name) {
                return;
            }
        }

        if (args.length === 1) {
            if (currentArg.length > 5) {
                return;
            }
            // the second argument must be `import.meta.url`
            if (currentArg.length === 0
                && (currentToken.type !== TokenType.name || processor.identifierNameForToken(currentToken) !== 'import')) {
                return;
            }
            if (currentArg.length === 1 && currentToken.type !== TokenType.dot) {
                return;
            }
            if (currentArg.length === 2
                && (currentToken.type !== TokenType.name || processor.identifierNameForToken(currentToken) !== 'meta')) {
                return;
            }
            if (currentArg.length === 3 && currentToken.type !== TokenType.dot) {
                return;
            }
            if (currentArg.length === 4
                && (currentToken.type !== TokenType.name || processor.identifierNameForToken(currentToken) !== 'url')) {
                return;
            }
        }
        if (args.length === 2) {
            // we dont handle cases with more than 2 arguments.
            return;
        }

        currentArg.push(currentToken);
        currentToken = processor.tokens[++iterator];
    }

    if (args.length !== 1) {
        return;
    }

    const firstArg = args[0][0];

    if (firstArg.type !== TokenType.string) {
        return getIdentifierValue(processor, firstArg);
    }

    return processor.stringValueForToken(firstArg);
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
export default function({ emit = true } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'meta-url',
        async setup(pluginBuild) {
            const build = useRna(pluginBuild);
            const { platform, format, sourcesContent, sourcemap } = build.getOptions();

            const usePlainScript = platform === 'browser' && format !== 'esm';
            const isNode = platform === 'node' && format !== 'esm';
            const baseUrl = (() => {
                if (usePlainScript) {
                    return '__currentScriptUrl__';
                }

                if (isNode) {
                    return '\'file://\' + __filename';
                }

                return 'import.meta.url';
            })();

            build.onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, async (args) => {
                const code = args.code;

                if (!code.includes('import.meta.url') ||
                    !code.includes('URL(')) {
                    return;
                }

                /**
                 * @type {Promise<void>[]}
                 */
                const promises = [];

                const { helpers, processor } = await parse(code, args.path);

                /**
                 * @type {import('esbuild').Message[]}
                 */
                const warnings = [];

                await walk(processor, () => {
                    const value = getMetaUrl(processor);
                    if (typeof value !== 'string' || isUrl(value)) {
                        return;
                    }

                    const id = getSearchParam(value, 'hash');
                    if (id && build.isEmittedPath(id)) {
                        return;
                    }

                    const tokens = getBlock(processor, TokenType.parenL, TokenType.parenR);
                    const startToken = tokens[0];
                    const endToken = tokens[tokens.length - 1];

                    promises.push(Promise.resolve().then(async () => {
                        const requestName = value.split('?')[0];
                        const { path: resolvedPath, pluginData } = await build.resolveLocallyFirst(requestName, {
                            kind: 'dynamic-import',
                            importer: args.path,
                            namespace: 'file',
                            resolveDir: path.dirname(args.path),
                            pluginData: null,
                        });

                        if (resolvedPath) {
                            if (pluginData !== Build.RESOLVED_AS_FILE) {
                                const location = getLocation(code, startToken.start);
                                warnings.push({
                                    pluginName: 'meta-url',
                                    text: `Resolving '${requestName}' as module is not a standard behavior and may be removed in a future relase of the plugin.`,
                                    location: {
                                        file: args.path,
                                        namespace: args.namespace,
                                        ...location,
                                        length: endToken.end - startToken.start,
                                        lineText: code.split('\n')[location.line - 1],
                                        suggestion: 'Externalize module import using a JS proxy file.',
                                    },
                                    notes: [],
                                    detail: '',
                                });
                            }

                            const entryLoader = build.getLoader(resolvedPath) || 'file';
                            const isChunk = entryLoader !== 'file' && entryLoader !== 'json';
                            let entryPoint;
                            if (emit) {
                                if (isChunk) {
                                    const chunk = await build.emitChunk({ path: resolvedPath });
                                    entryPoint = appendSearchParam(chunk.path, 'hash', chunk.id);
                                } else {
                                    const file = await build.emitFile(resolvedPath);
                                    entryPoint = appendSearchParam(file.path, 'hash', file.id);
                                }
                            } else {
                                entryPoint = path.relative(path.dirname(args.path), resolvedPath);
                            }

                            helpers.overwrite(startToken.start, endToken.end, `new URL('./${entryPoint}', ${baseUrl})`);

                            return;
                        }

                        const location = getLocation(code, startToken.start);
                        warnings.push({
                            pluginName: 'meta-url',
                            text: `Unable to resolve '${requestName}' file.`,
                            location: {
                                file: args.path,
                                namespace: args.namespace,
                                ...location,
                                length: endToken.end - startToken.start,
                                lineText: code.split('\n')[location.line - 1],
                                suggestion: '',
                            },
                            notes: [],
                            detail: '',
                        });
                    }));
                });

                await Promise.all(promises);

                if (!helpers.isDirty()) {
                    return {
                        warnings,
                    };
                }

                if (usePlainScript) {
                    helpers.prepend('var __currentScriptUrl__ = document.currentScript && document.currentScript.src || document.baseURI;\n');
                }

                return {
                    ...helpers.generate({
                        sourcemap: !!sourcemap,
                        sourcesContent,
                    }),
                    warnings,
                };
            });
        },
    };

    return plugin;
}
