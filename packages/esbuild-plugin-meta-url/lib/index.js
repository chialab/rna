import path from 'path';
import { isUrl, hasSearchParam } from '@chialab/node-resolve';
import { parse, walk, getIdentifierValue, getBlock, TokenType } from '@chialab/estransform';
import { useRna } from '@chialab/esbuild-rna';

/**
 * @param {import('@chialab/estransform').TokenProcessor} processor Token processor.
 * @return {string|undefined} The path value.
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
 * @return An esbuild plugin.
 */
export default function({ emit = true } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'meta-url',
        async setup(build) {
            const { platform, format, sourcesContent, sourcemap } = build.initialOptions;
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

                await walk(processor, () => {
                    const value = getMetaUrl(processor);
                    if (typeof value !== 'string' || isUrl(value)) {
                        return;
                    }

                    const tokens = getBlock(processor, TokenType.parenL, TokenType.parenR);
                    const startToken = tokens[0];
                    const endToken = tokens[tokens.length - 1];

                    if (hasSearchParam(value, 'emit')) {
                        // already emitted
                        helpers.overwrite(startToken.start, endToken.end, `new URL('${value}', ${baseUrl})`);
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

                        const entryLoader = buildLoaders[path.extname(resolvedPath)] || 'file';
                        const entryPoint = emit ?
                            (entryLoader !== 'file' ? await emitChunk({ entryPoint: resolvedPath }) : await emitFile(resolvedPath)).path :
                            `./${path.relative(path.dirname(args.path), resolvedPath)}`;

                        helpers.overwrite(startToken.start, endToken.end, `new URL('${entryPoint}', ${baseUrl})`);
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
