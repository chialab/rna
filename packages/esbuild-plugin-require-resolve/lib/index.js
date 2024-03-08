import path from 'path';
import { useRna } from '@chialab/esbuild-rna';
import { parse, walk } from '@chialab/estransform';

/**
 * A file loader plugin for esbuild for `require.resolve` statements.
 * @returns An esbuild plugin.
 */
export default function () {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'require-resolve',
        setup(pluginBuild) {
            const build = useRna(plugin, pluginBuild);
            const { sourcesContent, sourcemap } = build.getOptions();
            const workingDir = build.getWorkingDir();

            build.onTransform({ loaders: ['tsx', 'ts', 'jsx', 'js'] }, async (args) => {
                if (!args.code.includes('require.resolve')) {
                    return;
                }

                const { ast, helpers } = await parse(args.code, path.relative(workingDir, args.path));
                await walk(ast, {
                    async CallExpression(node) {
                        if (
                            node.callee.type !== 'StaticMemberExpression' ||
                            node.callee.object.type !== 'Identifier' ||
                            node.callee.object.name !== 'require' ||
                            node.callee.property.type !== 'Identifier' ||
                            node.callee.property.name !== 'resolve'
                        ) {
                            return;
                        }

                        const argument = node.arguments[0];
                        if (argument.type !== 'StringLiteral') {
                            return;
                        }

                        const fileName = argument.value;
                        const { path: resolvedFilePath } = await build.resolve(fileName, {
                            kind: 'require-resolve',
                            importer: args.path,
                            resolveDir: path.dirname(args.path),
                        });
                        if (!resolvedFilePath) {
                            return;
                        }

                        const emittedFile = await build.emitFile(resolvedFilePath);
                        const outputFile = build.resolveRelativePath(emittedFile.path);
                        helpers.overwrite(argument.start, argument.end, `'${outputFile}'`);
                    },
                });

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
