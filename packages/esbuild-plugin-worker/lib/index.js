import path from 'path';
import { walk, parse, TokenType, getIdentifierValue, getLocation, getBlock, splitArgs } from '@chialab/estransform';
import { appendSearchParam, getSearchParam } from '@chialab/node-resolve';
import metaUrlPlugin from '@chialab/esbuild-plugin-meta-url';
import { useRna } from '@chialab/esbuild-rna';

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
    const blobContent = transformOptions.format === 'esm' ?
        `'import "' + ${createUrlFn}(${argument}) + '";'` :
        `'importScripts("' + ${createUrlFn}(${argument}) + '");'`;

    return `${checkType ? `typeof ${argument} !== 'string' ? ${argument} : ` : ''}URL.createObjectURL(new Blob([${blobContent}], { type: 'text/javascript' }))`;
}

/**
 * Instantiate a plugin that collect and builds Web Workers.
 * @param {PluginOptions} options
 * @returns An esbuild plugin.
 */
export default function({ constructors = ['Worker', 'SharedWorker'], proxy = false, emit = true } = {}) {
    const variants = constructors.reduce((acc, Ctr) => [
        ...acc,
        Ctr,
        `window.${Ctr}`,
        `globalThis.${Ctr}`,
        `self.${Ctr}`,
    ], /** @type {string[]} */ ([]));

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'worker',
        async setup(pluginBuild) {
            const build = useRna(plugin, pluginBuild);
            const { format, bundle, sourcesContent, sourcemap } = build.getOptions();
            const workingDir = build.getWorkingDir();

            await build.setupPlugin([metaUrlPlugin({ emit })], 'after');

            build.onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, async (args) => {
                const code = args.code;

                if (!variants.find((ctr) => code.includes(`new ${ctr}`))) {
                    return;
                }

                /**
                 * @type {Promise<void>[]}
                 */
                const promises = [];

                /**
                 * @type {Set<string>}
                 */
                const redefined = new Set();

                const { helpers, processor } = await parse(code, path.relative(workingDir, args.path));
                await walk(processor, (token) => {
                    if (token.type === TokenType._class) {
                        processor.nextToken();
                        if (processor.currentToken().type === TokenType.name) {
                            const name = processor.identifierNameForToken(processor.currentToken());
                            if (constructors.includes(name)) {
                                redefined.add(name);
                            }
                        }
                    }
                });

                /**
                 * @type {import('esbuild').Message[]}
                 */
                const warnings = [];

                await walk(processor, (token) => {
                    if (token.type !== TokenType._new) {
                        return;
                    }

                    processor.nextToken();
                    let Ctr = processor.identifierNameForToken(processor.currentToken());
                    if (Ctr === 'window' || Ctr === 'self' || Ctr === 'globalThis') {
                        processor.nextToken();
                        processor.nextToken();
                        Ctr = `${Ctr}.${processor.identifierNameForToken(processor.currentToken())}`;
                    }

                    if (redefined.has(Ctr)) {
                        return;
                    }

                    if (!variants.includes(Ctr)) {
                        return;
                    }

                    const block = getBlock(processor, TokenType.parenL, TokenType.parenR);
                    const argsBlock = block.slice(2, -1);
                    const [firstArg, secondArg] = splitArgs(argsBlock);
                    if (!firstArg) {
                        return;
                    }

                    const startToken = firstArg[0];
                    const endToken = firstArg[firstArg.length - 1];
                    let reference = startToken;

                    if (startToken.type === TokenType._new
                        && firstArg[1].type === TokenType.name
                        && processor.identifierNameForToken(firstArg[1]) === 'URL'
                    ) {
                        const firstParen = firstArg.findIndex((token) => token.type === TokenType.parenL);
                        const lastParen = -firstArg.slice(0).reverse().findIndex((token) => token.type === TokenType.parenR);
                        const [urlArgs, metaArgs] = splitArgs(firstArg.slice(firstParen + 1, lastParen - 1));

                        if (
                            metaArgs
                            && metaArgs.length === 5
                            && metaArgs[0].type === TokenType.name
                            && processor.identifierNameForToken(metaArgs[0]) === 'import'
                            && metaArgs[1].type === TokenType.dot
                            && metaArgs[2].type === TokenType.name
                            && processor.identifierNameForToken(metaArgs[2]) === 'meta'
                            && metaArgs[3].type === TokenType.dot
                            && metaArgs[4].type === TokenType.name
                            && processor.identifierNameForToken(metaArgs[4]) === 'url'
                        ) {
                            if (urlArgs.length === 1) {
                                reference = urlArgs[0];
                            }
                        }
                    }

                    const isStringLiteral = reference && reference.type === TokenType.string;
                    const isIdentifier = reference && reference.type === TokenType.name;
                    if (!isStringLiteral && !isIdentifier && !proxy) {
                        return;
                    }

                    /**
                     * @type {import('@chialab/esbuild-rna').BuildOptions}
                     */
                    const transformOptions = {
                        format: 'iife',
                        bundle: true,
                        platform: 'neutral',
                    };

                    if ((format !== 'iife' || !bundle) && secondArg && secondArg.length >= 4 && secondArg[0].type === TokenType.braceL) {
                        if (
                            (
                                (secondArg[1].type === TokenType.string && processor.stringValueForToken(secondArg[1]) === 'type')
                                || (secondArg[1].type === TokenType.name && processor.identifierNameForToken(secondArg[1]) === 'type')
                            )
                            && secondArg[2].type === TokenType.colon
                            && secondArg[3].type === TokenType.string
                            && processor.stringValueForToken(secondArg[3]) === 'module'
                        ) {
                            transformOptions.format = 'esm';
                            delete transformOptions.external;
                            delete transformOptions.bundle;
                        }
                    }

                    promises.push(Promise.resolve().then(async () => {
                        const value = isStringLiteral ?
                            processor.stringValueForToken(reference) :
                            isIdentifier ?
                                getIdentifierValue(processor, reference) :
                                null;

                        if (typeof value !== 'string') {
                            if (proxy) {
                                const arg = code.substring(firstArg[0].start, firstArg[firstArg.length - 1].end);
                                helpers.overwrite(firstArg[0].start, firstArg[firstArg.length - 1].end, createBlobProxy(arg, transformOptions, true));
                            }
                            return;
                        }

                        const id = getSearchParam(value, 'hash');
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
                            const location = getLocation(code, startToken.start);
                            warnings.push({
                                id: 'worker-reference-not-found',
                                pluginName: 'worker',
                                text: `Unable to resolve '${value}' file.`,
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
                            return;
                        }

                        let emittedChunk;
                        let entryPoint = path.relative(path.dirname(args.path), resolvedPath);
                        if (emit) {
                            emittedChunk = await build.emitChunk({
                                ...transformOptions,
                                path: resolvedPath,
                                write: format !== 'iife' || !bundle,
                            });
                            entryPoint = appendSearchParam(emittedChunk.path, 'hash', emittedChunk.id);
                        }

                        if (emittedChunk && format === 'iife' && bundle) {
                            const { outputFiles } = emittedChunk;
                            if (outputFiles) {
                                const base64 = Buffer.from(outputFiles[0].contents).toString('base64');
                                helpers.overwrite(startToken.start, endToken.end, `new URL('data:text/javascript;base64,${base64}')`);
                            }
                        } else {
                            const arg = `new URL('./${entryPoint}', import.meta.url).href`;
                            if (proxy) {
                                helpers.overwrite(firstArg[0].start, firstArg[firstArg.length - 1].end, createBlobProxy(arg, transformOptions, false));
                            } else {
                                helpers.overwrite(firstArg[0].start, firstArg[firstArg.length - 1].end, arg);
                            }
                        }
                    }));
                });

                await Promise.all(promises);

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
        },
    };

    return plugin;
}
