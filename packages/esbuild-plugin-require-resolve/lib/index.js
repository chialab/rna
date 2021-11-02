import { MagicString, getSpanLocation, parse, walk } from '@chialab/estransform';
import { useRna } from '@chialab/esbuild-rna';

/**
 * Instantiate a plugin that converts URL references into static import
 * in order to handle assets bundling.
 * @return An esbuild plugin.
 */
export default function() {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'require-resolve',
        setup(build) {
            const { sourcesContent } = build.initialOptions;
            const { onResolve, onLoad, onTransform, transform, resolve, rootDir } = useRna(build);

            onResolve({ filter: /\.requirefile$/ }, async ({ path: filePath }) => ({
                path: filePath.replace(/\.requirefile$/, ''),
                namespace: 'require-resolve',
            }));

            onLoad({ filter: /\./, namespace: 'require-resolve' }, (args) => transform(args));

            onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, async (args) => {
                const code = args.code.toString();

                if (!code.includes('require.resolve(')) {
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
                     * @param {import('@chialab/estransform').CallExpression} node
                     */
                    CallExpression(node) {
                        if (!node.callee ||
                            node.callee.type !== 'MemberExpression' ||
                            node.callee.object.type !== 'Identifier' ||
                            node.callee.object.value !== 'require' ||
                            node.callee.property.type !== 'Identifier' ||
                            node.callee.property.value !== 'resolve') {
                            return;
                        }

                        if (node.arguments.length !== 1) {
                            return;
                        }

                        const firstArg = node.arguments[0].expression;
                        if (firstArg.type !== 'StringLiteral') {
                            return;
                        }

                        magicCode = magicCode || new MagicString(code);

                        promises.push((async () => {
                            const value = firstArg.value;
                            const entryPoint = await resolve({
                                kind: 'require-resolve',
                                path: value,
                                importer: args.path,
                                pluginData: null,
                                namespace: 'file',
                                resolveDir: rootDir,
                            });
                            const identifier = `_${value.replace(/[^a-zA-Z0-9]/g, '_')}`;

                            const loc = getSpanLocation(ast, node);
                            if (code.startsWith('#!')) {
                                magicCode.appendRight(code.indexOf('\n') + 1, `var ${identifier} = require('${entryPoint}.requirefile');\n`);
                            } else {
                                magicCode.prepend(`var ${identifier} = require('${entryPoint}.requirefile');\n`);
                            }

                            magicCode.overwrite(loc.start, loc.end, identifier);
                        })());
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
