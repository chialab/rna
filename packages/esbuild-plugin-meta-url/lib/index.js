import { readFile } from 'fs/promises';
import path from 'path';
import { TARGETS, pipe, walk, createTypeScriptTransform, getOffsetFromLocation } from '@chialab/estransform';
import { SCRIPT_LOADERS, getEntry, finalizeEntry, createFilter } from '@chialab/esbuild-plugin-transform';

/**
 * Instantiate a plugin that converts URL references into static import
 * in order to handle assets bundling.
 * @param {typeof import('esbuild')} [esbuild]
 * @return An esbuild plugin.
 */
export default function(esbuild) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'meta-url',
        setup(build) {
            const options = build.initialOptions;

            build.onResolve({ filter: /\.urlfile$/ }, async ({ path: filePath }) => ({
                path: filePath.replace(/\.urlfile$/, ''),
                namespace: 'meta-url',
            }));

            build.onLoad({ filter: /\./, namespace: 'meta-url' }, async ({ path: filePath }) => ({
                contents: await readFile(filePath),
                loader: 'file',
            }));

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

                const { fileResolve } = await import('@chialab/node-resolve');
                const outdir = options.outdir || (options.outfile && path.dirname(options.outfile)) || process.cwd();
                const loaders = options.loader || {};

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

                            promises.push((async () => {
                                const value = node.arguments[0].value;
                                const loader = loaders[path.extname(value)];
                                let baseUrl = 'import.meta.url';
                                if (options.platform === 'browser' && options.format !== 'esm') {
                                    baseUrl = 'document.baseURI';
                                } else if (options.platform === 'node' && options.format !== 'esm') {
                                    baseUrl = '\'file://\' + __filename';
                                }
                                const entryPoint = await fileResolve(value, path.dirname(args.path));
                                const startOffset = getOffsetFromLocation(code, node.loc.start.line, node.loc.start.column);
                                const endOffset = getOffsetFromLocation(code, node.loc.end.line, node.loc.end.column);

                                if (SCRIPT_LOADERS.includes(loader) || loader === 'css') {
                                    esbuild = esbuild || await import('esbuild');
                                    /** @type {import('esbuild').BuildOptions} */
                                    const config = {
                                        ...options,
                                        entryPoints: [entryPoint],
                                        outfile: undefined,
                                        outdir,
                                        metafile: true,
                                    };
                                    const result = await esbuild.build(config);
                                    if (result.metafile) {
                                        const outputs = result.metafile.outputs;
                                        const outputFiles = Object.keys(outputs);
                                        const outputFile = outputFiles
                                            .filter((output) => !output.endsWith('.map'))
                                            .filter((output) => outputs[output].entryPoint)
                                            .find((output) => entryPoint === path.resolve(/** @type {string} */(outputs[output].entryPoint))) || outputFiles[0];

                                        magicCode.overwrite(startOffset, endOffset, `new URL('./${path.basename(outputFile)}', ${baseUrl})`);
                                    }
                                } else {
                                    if (!ids[entryPoint]) {
                                        const identifier = ids[entryPoint] = `_${value.replace(/[^a-zA-Z0-9]/g, '_')}`;
                                        if (code.startsWith('#!')) {
                                            magicCode.appendRight(code.indexOf('\n') + 1, `import ${identifier} from '${entryPoint}.urlfile';\n`);
                                        } else {
                                            magicCode.prepend(`import ${identifier} from '${entryPoint}.urlfile';\n`);
                                        }
                                    }
                                    magicCode.overwrite(startOffset, endOffset, `new URL(${ids[entryPoint]}, ${baseUrl})`);
                                }
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
