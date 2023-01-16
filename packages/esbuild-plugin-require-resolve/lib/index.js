import path from 'path';
import { TokenType, parse, walk } from '@chialab/estransform';
import { useRna } from '@chialab/esbuild-rna';

/**
 * A file loader plugin for esbuild for `require.resolve` statements.
 * @returns An esbuild plugin.
 */
export default function() {

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

                /**
                 * @type {Promise<void>[]}
                 */
                const promises = [];

                const { helpers, processor } = await parse(args.code, path.relative(workingDir, args.path));
                await walk(processor, () => {
                    if (!processor.matches5(TokenType.name, TokenType.dot, TokenType.name, TokenType.parenL, TokenType.string)) {
                        return;
                    }

                    const nsName = processor.identifierNameForToken(processor.currentToken());
                    if (nsName !== 'require') {
                        return;
                    }

                    processor.nextToken();
                    processor.nextToken();

                    const fnName = processor.identifierNameForToken(processor.currentToken());
                    if (fnName !== 'resolve') {
                        return;
                    }

                    processor.nextToken();
                    processor.nextToken();

                    const stringToken = processor.currentToken();
                    const fileName = processor.stringValueForToken(stringToken);
                    promises.push((async () => {
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
                        helpers.overwrite(stringToken.start, stringToken.end, `'${outputFile}'`);
                    })());
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
