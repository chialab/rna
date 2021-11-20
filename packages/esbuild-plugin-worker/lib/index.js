import { MagicString, generate, walk, parse, getSpanLocation } from '@chialab/estransform';
import metaUrlPlugin, { getMetaUrl } from '@chialab/esbuild-plugin-meta-url';
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
            const { onTransform, resolve, emitChunk, setupPlugin, rootDir } = useRna(build);
            await setupPlugin(plugin, [metaUrlPlugin()], 'after');

            const { sourcesContent } = build.initialOptions;

            onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, async (args) => {
                const code = args.code.toString();

                if (variants.every((ctr) => !code.includes(ctr))) {
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
                        let callee = node.callee;
                        if (callee.type === 'MemberExpression') {
                            if (callee.object.type === 'Identifier') {
                                if (
                                    callee.object.value !== 'window' &&
                                    callee.object.value !== 'self' &&
                                    callee.object.value !== 'globalThis') {
                                    return;
                                }
                            }
                            callee = callee.property;
                        }
                        if (callee.type !== 'Identifier') {
                            return;
                        }
                        const Ctr = callee.value;
                        if (!constructors.includes(Ctr)) {
                            return;
                        }
                        if (!node.arguments.length) {
                            return;
                        }

                        const firstArg = /** @type {import('@chialab/estransform').StringLiteral|import('@chialab/estransform').NewExpression|import('@chialab/estransform').MemberExpression} */ (node.arguments[0] && node.arguments[0].expression);

                        /**
                         * @type {Omit<import('@chialab/esbuild-rna').EmitTransformOptions, 'entryPoint'>}
                         */
                        const transformOptions = {
                            format: 'iife',
                            bundle: true,
                            platform: 'neutral',
                        };
                        const workerOptions = node.arguments[1] && node.arguments[1].expression;
                        if (workerOptions &&
                            workerOptions.type === 'ObjectExpression' &&
                            workerOptions.properties &&
                            workerOptions.properties.some(
                                /**
                                 * @param {import('@swc/core').Property|import('@swc/core').SpreadElement} prop
                                 */
                                (prop) =>
                                    prop.type === 'KeyValueProperty' &&
                                    (prop.key.type === 'StringLiteral' || prop.key.type === 'Identifier') &&
                                    prop.key?.value === 'type' &&
                                    prop.value.type === 'StringLiteral' &&
                                    prop.value?.value === 'module'
                            )
                        ) {
                            transformOptions.format = 'esm';
                        } else {
                            transformOptions.splitting = false;
                            transformOptions.inject = [];
                            transformOptions.plugins = [];
                        }

                        promises.push(Promise.resolve().then(async () => {
                            const loc = getSpanLocation(ast, node);
                            const value = firstArg.type === 'StringLiteral' ? firstArg.value : getMetaUrl(firstArg, ast);
                            if (typeof value !== 'string') {
                                if (proxy) {
                                    magicCode = magicCode || new MagicString(code);
                                    const arg = await generate(firstArg);
                                    magicCode.overwrite(loc.start, loc.end, `new ${Ctr}(${createBlobProxy(arg, transformOptions)})`);
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
                                resolvedPath;
                            const arg = `new URL('${entryPoint}', import.meta.url).href`;
                            if (proxy) {
                                magicCode.overwrite(loc.start, loc.end, `new ${Ctr}(${createBlobProxy(arg, transformOptions)})`);
                            } else {
                                magicCode.overwrite(loc.start, loc.end, `new ${Ctr}(${arg})`);
                            }
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
