import path from 'path';
import { walk, parse, TokenType, getIdentifierValue, getBlock, splitArgs } from '@chialab/estransform';
import metaUrlPlugin from '@chialab/esbuild-plugin-meta-url';
import { useRna } from '@chialab/esbuild-rna';

/**
 * @typedef {{ constructors?: string[], proxy?: boolean, emit?: boolean }} PluginOptions
 */

/**
 * Create a blob proxy worker code.
 * @param {string} argument The url reference.
 * @param {Omit<import('@chialab/esbuild-rna').EmitTransformOptions, 'entryPoint'>} transformOptions The transform options for the url.
 */
function createBlobProxy(argument, transformOptions) {
    const createUrlFn = `(function(path) {
    const url = new URL(path);
    url.searchParams.set('transform', '${JSON.stringify(transformOptions)}');
    return url.href;
})`;
    const blobContent = transformOptions.format === 'esm' ?
        `'import "' + ${createUrlFn}(${argument}) + '";'` :
        `'importScripts("' + ${createUrlFn}(${argument}) + '");'`;

    return `URL.createObjectURL(new Blob([${blobContent}], { type: 'text/javascript' }))`;
}

/**
 * Instantiate a plugin that collect and builds Web Workers.
 * @param {PluginOptions} options
 * @return An esbuild plugin.
 */
export default function({ constructors = ['Worker', 'SharedWorker'], proxy = false, emit = true } = {}) {
    const variants = constructors.reduce((acc, Ctr) => [
        ...acc,
        `new ${Ctr}`,
        `new window.${Ctr}`,
        `new globalThis.${Ctr}`,
        `new self.${Ctr}`,
    ], /** @type {string[]} */ ([]));

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'worker',
        async setup(build) {
            const { sourcesContent, sourcemap } = build.initialOptions;
            const { onTransform, resolve, emitChunk, setupPlugin, rootDir } = useRna(build);
            await setupPlugin(plugin, [metaUrlPlugin({ emit })], 'after');

            onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, async (args) => {
                const code = args.code;

                if (!variants.find((ctr) => code.includes(ctr))) {
                    return;
                }

                /**
                 * @type {Promise<void>[]}
                 */
                const promises = [];

                const { helpers, processor } = await parse(code, args.path);
                await walk(processor, (token) => {
                    if (token.type !== TokenType._new) {
                        return;
                    }

                    processor.nextToken();
                    let Ctr = processor.identifierNameForToken(processor.currentToken());
                    if (Ctr === 'window' || Ctr === 'self' || Ctr === 'globalThis') {
                        processor.nextToken();
                        processor.nextToken();
                        Ctr = processor.identifierNameForToken(processor.currentToken());
                    }

                    if (!constructors.includes(Ctr)) {
                        return;
                    }

                    const block = getBlock(processor, TokenType.parenL, TokenType.parenR);
                    const argsBlock = block.slice(2, -1);
                    const [firstArg, secondArg] = splitArgs(argsBlock);
                    if (!firstArg) {
                        return;
                    }

                    let reference = firstArg[0];

                    if (firstArg[0].type === TokenType._new
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
                     * @type {Omit<import('@chialab/esbuild-rna').EmitTransformOptions, 'entryPoint'>}
                     */
                    const transformOptions = {
                        format: 'iife',
                        bundle: true,
                        platform: 'neutral',
                        jsxFactory: undefined,
                    };

                    if (secondArg && secondArg.length >= 4 && secondArg[0].type === TokenType.braceL) {
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
                        }
                    }

                    const start = token.start;
                    const end = block[block.length - 1].end;

                    promises.push(Promise.resolve().then(async () => {
                        const value = isStringLiteral ?
                            processor.stringValueForToken(reference) :
                            isIdentifier ?
                                getIdentifierValue(processor, reference) :
                                null;

                        if (typeof value !== 'string') {
                            if (proxy) {
                                const arg = code.substring(firstArg[0].start, firstArg[firstArg.length - 1].end);
                                helpers.overwrite(start, end, `new ${Ctr}(${createBlobProxy(arg, transformOptions)})`);
                            }
                            return;
                        }

                        const { path: resolvedPath } = await resolve({
                            kind: 'dynamic-import',
                            path: value,
                            importer: args.path,
                            namespace: 'file',
                            resolveDir: rootDir,
                            pluginData: undefined,
                        });
                        if (!resolvedPath) {
                            return;
                        }

                        const entryPoint = emit ?
                            (await emitChunk({
                                ...transformOptions,
                                entryPoint: resolvedPath,
                            })).path :
                            `./${path.relative(path.dirname(args.path), resolvedPath)}`;
                        const arg = `new URL('${entryPoint}', import.meta.url).href`;
                        if (proxy) {
                            helpers.overwrite(start, end, `new ${Ctr}(${createBlobProxy(arg, transformOptions)})`);
                        } else {
                            helpers.overwrite(start, end, `new ${Ctr}(${arg})`);
                        }
                    }));
                });

                await Promise.all(promises);

                if (!helpers.isDirty()) {
                    return;
                }

                return helpers.generate({
                    sourcemap: !!sourcemap,
                    sourcesContent,
                });
            });
        },
    };

    return plugin;
}
