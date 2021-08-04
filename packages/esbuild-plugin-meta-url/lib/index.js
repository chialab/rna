import { readFile } from 'fs/promises';
import path from 'path';
import { resolve as defaultResolve, isUrl } from '@chialab/node-resolve';
import { TARGETS, pipe, walk, createTypeScriptTransform, getOffsetFromLocation } from '@chialab/estransform';
import { SCRIPT_LOADERS, getEntry, finalizeEntry, createFilter } from '@chialab/esbuild-plugin-transform';

/**
 * @typedef {{ resolve?: typeof defaultResolve, transformUrl?: (filePath: string, importer: string) => string|void }} PluginOptions
 */

export const REQUEST_PARAM = {
    name: 'loader',
    value: 'file',
};

/**
 * @param {string} source
 */
export function appendFileParam(source) {
    if (source.match(/(\?|&)loader=file/)) {
        return source;
    }
    if (source.includes('?')) {
        return `${source}&loader=file`;
    }
    return `${source}?loader=file`;
}

/**
 * Instantiate a plugin that converts URL references into static import
 * in order to handle assets bundling.
 * @param {PluginOptions} [options]
 * @param {typeof import('esbuild')} [esbuild]
 * @return An esbuild plugin.
 */
export default function({ resolve = defaultResolve, transformUrl } = {}, esbuild) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'meta-url',
        setup(build) {
            const options = build.initialOptions;
            const outdir = options.outdir || (options.outfile && path.dirname(options.outfile)) || process.cwd();
            const loaders = options.loader || {};

            build.onResolve({ filter: /(\?|&)loader=file$/ }, async ({ path: filePath }) => ({
                path: filePath.split('?')[0],
                namespace: 'meta-url',
            }));

            build.onLoad({ filter: /\./, namespace: 'meta-url' }, async ({ path: filePath }) => {
                const loader = loaders[path.extname(filePath)];
                if (SCRIPT_LOADERS.includes(loader) || loader === 'css') {
                    esbuild = esbuild || await import('esbuild');
                    /** @type {import('esbuild').BuildOptions} */
                    const config = {
                        ...options,
                        entryPoints: [filePath],
                        outfile: undefined,
                        outdir,
                        metafile: true,
                    };
                    const result = await esbuild.build(config);
                    if (result.metafile) {
                        const outputs = result.metafile.outputs;
                        const outputFiles = Object.keys(outputs);
                        filePath = outputFiles
                            .filter((output) => !output.endsWith('.map'))
                            .filter((output) => outputs[output].entryPoint)
                            .find((output) => filePath === path.resolve(/** @type {string} */(outputs[output].entryPoint))) || outputFiles[0];
                    }
                }
                return {
                    contents: await readFile(filePath),
                    loader: 'file',
                };
            });

            build.onLoad({ filter: createFilter(build), namespace: 'file' }, async (args) => {
                /**
                 * @type {import('@chialab/estransform').Pipeline}
                 */
                const entry = args.pluginData || await getEntry(build, args.path);
                if (!entry.code.includes('import.meta.url') ||
                    !entry.code.includes('URL(')) {
                    return;
                }

                if (entry.target === TARGETS.typescript) {
                    await pipe(entry, {
                        source: path.basename(args.path),
                        sourcesContent: options.sourcesContent,
                    }, createTypeScriptTransform({
                        loader: entry.loader,
                        jsxFactory: options.jsxFactory,
                        jsxFragment: options.jsxFragment,
                    }));
                }

                await pipe(entry, {
                    source: path.basename(args.path),
                    sourcesContent: options.sourcesContent,
                }, async ({ magicCode, code, ast }) => {
                    /**
                     * @type {{ [key: string]: string }}
                     */
                    const ids = {};

                    /**
                     * @type {Promise<void>[]}
                     */
                    const promises = [];

                    let baseUrl = 'import.meta.url';
                    if (options.platform === 'browser' && options.format !== 'esm') {
                        baseUrl = 'document.baseURI';
                    } else if (options.platform === 'node' && options.format !== 'esm') {
                        baseUrl = '\'file://\' + __filename';
                    }

                    walk(ast, {
                        /**
                         * @param {*} node
                         */
                        NewExpression(node) {
                            if (!node.callee || node.callee.type !== 'Identifier' || node.callee.name !== 'URL') {
                                return;
                            }

                            if (node.arguments.length !== 2 ||
                                node.arguments[0].type !== 'Literal' ||
                                node.arguments[1].type !== 'MemberExpression') {
                                return;
                            }

                            if (node.arguments[1].object.type !== 'MetaProperty' ||
                                node.arguments[1].property.type !== 'Identifier' ||
                                node.arguments[1].property.name !== 'url') {
                                return;
                            }

                            const value = node.arguments[0].value;
                            if (value.startsWith('/') || isUrl(value)) {
                                return;
                            }

                            promises.push((async () => {
                                const entryPoint = await resolve(value, args.path);
                                const startOffset = getOffsetFromLocation(code, node.loc.start.line, node.loc.start.column);
                                const endOffset = getOffsetFromLocation(code, node.loc.end.line, node.loc.end.column);
                                const transformedUrl = transformUrl && transformUrl(entryPoint, args.path);
                                if (transformedUrl) {
                                    magicCode.overwrite(startOffset, endOffset, `new URL('${transformedUrl}', ${baseUrl})`);
                                    return;
                                }

                                if (!ids[entryPoint]) {
                                    const identifier = ids[entryPoint] = `_${value.replace(/[^a-zA-Z0-9]/g, '_')}`;
                                    if (code.startsWith('#!')) {
                                        magicCode.appendRight(code.indexOf('\n') + 1, `import ${identifier} from '${appendFileParam(entryPoint)}';\n`);
                                    } else {
                                        magicCode.prepend(`import ${identifier} from '${appendFileParam(entryPoint)}';\n`);
                                    }
                                }

                                magicCode.overwrite(startOffset, endOffset, `new URL(${ids[entryPoint]}, ${baseUrl})`);
                            })());
                        },
                    });

                    await Promise.all(promises);
                });

                return finalizeEntry(build, args.path);
            });
        },
    };

    return plugin;
}
