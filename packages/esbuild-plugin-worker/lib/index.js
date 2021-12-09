import path from 'path';
import { MagicString, walk, parse, TokenType, getBlock } from '@chialab/estransform';
import metaUrlPlugin, { findIdentifierValue } from '@chialab/esbuild-plugin-meta-url';
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
                 * @type {MagicString|undefined}
                 */
                let magicCode;

                /**
                 * @type {Promise<void>[]}
                 */
                const promises = [];
                const { processor } = await parse(code);
                await walk(processor, (token, start) => {
                    if (!processor.matches1(TokenType._new)) {
                        return;
                    }

                    processor.nextToken();
                    let Ctr = processor.identifierNameForToken(processor.currentToken());
                    if (!constructors.includes(Ctr)
                        && (
                            Ctr === 'window'
                            || Ctr === 'self'
                            || Ctr === 'globalThis'
                        )
                    ) {
                        processor.nextToken();
                        Ctr = processor.identifierNameForToken(processor.currentToken());
                    }

                    if (!constructors.includes(Ctr)) {
                        return;
                    }

                    const block = getBlock(processor, TokenType.parenL, TokenType.parenR);
                    const firstArg = block[1];

                    if (firstArg.type !== TokenType.string
                        && firstArg.type !== TokenType.name) {
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

                    if (block[2] && block[2].type === TokenType.comma && block[3].type === TokenType.braceL) {
                        if (
                            (
                                (block[4].type === TokenType.string && processor.stringValueForToken(block[4]) === 'type')
                                || (block[4].type === TokenType.name && processor.identifierNameForToken(block[4]) === 'type')
                            )
                            && block[5].type === TokenType.colon
                            && block[6].type === TokenType.string
                            && processor.stringValueForToken(block[6]) === 'module'
                        ) {
                            transformOptions.format = 'esm';
                        }
                    }

                    const end = block[block.length - 1].end;
                    promises.push(Promise.resolve().then(async () => {
                        const value = firstArg.type === TokenType.string ?
                            processor.stringValueForToken(firstArg) :
                            findIdentifierValue(processor.identifierNameForToken(firstArg), processor);
                        if (typeof value !== 'string') {
                            if (proxy) {
                                const arg = code.substring(firstArg.start, firstArg.end);
                                magicCode = magicCode || new MagicString(code);
                                magicCode.overwrite(start, end, `new ${Ctr}(${createBlobProxy(arg, transformOptions)})`);
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

                        magicCode = magicCode || new MagicString(code);

                        const entryPoint = emit ?
                            (await emitChunk({
                                ...transformOptions,
                                entryPoint: resolvedPath,
                            })).path :
                            `./${path.relative(path.dirname(args.path), resolvedPath)}`;
                        const arg = `new URL('${entryPoint}', import.meta.url).href`;
                        if (proxy) {
                            magicCode.overwrite(start, end, `new ${Ctr}(${createBlobProxy(arg, transformOptions)})`);
                        } else {
                            magicCode.overwrite(start, end, `new ${Ctr}(${arg})`);
                        }
                    }));
                });

                await Promise.all(promises);

                if (!magicCode) {
                    return;
                }

                return {
                    code: magicCode.toString(),
                    map: sourcemap ? magicCode.generateMap({
                        source: args.path,
                        includeContent: sourcesContent,
                        hires: true,
                    }) : undefined,
                };
            });
        },
    };

    return plugin;
}
