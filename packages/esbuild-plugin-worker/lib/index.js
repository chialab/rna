import path from 'path';
import { walk, parse, TokenType, getIdentifierValue, getBlock, splitArgs } from '@chialab/estransform';
import { appendSearchParam } from '@chialab/node-resolve';
import metaUrlPlugin from '@chialab/esbuild-plugin-meta-url';
import { useRna } from '@chialab/esbuild-rna';

/**
 * @typedef {{ constructors?: string[], proxy?: boolean, emit?: boolean }} PluginOptions
 */

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

            build.onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, async (args) => {
                const code = args.code;

                if (!variants.find((ctr) => code.includes(`new ${ctr}`))) {
                    return;
                }

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

                    /**
                     * @type {*}
                     */
                    let reference;
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
                    } else if (startToken.type === TokenType.name) {
                        reference = startToken;
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

                    const value = isStringLiteral ?
                        processor.stringValueForToken(reference) :
                        isIdentifier ?
                            getIdentifierValue(processor, reference) :
                            null;

                    if (typeof value !== 'string') {
                        if (proxy) {
                            const arg = code.substring(startToken.start, endToken.end);
                            const createUrlFn = `(function(path) {
                                const url = new URL(path);
                                url.searchParams.set('transform', '${JSON.stringify(transformOptions)}');
                                return url.href;
                            })`;
                            const blobContent = transformOptions.format === 'esm' ?
                                `'import "' + ${createUrlFn}(${arg}) + '";'` :
                                `'importScripts("' + ${createUrlFn}(${arg}) + '");'`;

                            helpers.overwrite(startToken.start, endToken.end, `typeof ${arg} !== 'string' ? ${arg} : URL.createObjectURL(new Blob([${blobContent}], { type: 'text/javascript' }))`);
                        }
                        return;
                    }

                    const entrypoint = `new URL('${appendSearchParam(value, 'transform', JSON.stringify(transformOptions))}', import.meta.url)`;
                    if (proxy) {
                        const blobContent = transformOptions.format === 'esm' ?
                            `'import "' + ${entrypoint} + '";'` :
                            `'importScripts("' + ${entrypoint} + '");'`;

                        helpers.overwrite(startToken.start, endToken.end, `URL.createObjectURL(new Blob([${blobContent}], { type: 'text/javascript' }))`);
                    } else {
                        helpers.overwrite(startToken.start, endToken.end, entrypoint);
                    }
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
