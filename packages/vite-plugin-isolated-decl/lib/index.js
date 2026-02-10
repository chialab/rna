/**
 * Get the common directory from a list of paths.
 * @param {string[]} paths The list of paths to analyze.
 * @returns {string} The common directory of the given paths.
 */
function commonDir(paths) {
    /**
     * @type {string[] | null}
     */
    let result = null;
    for (const path of paths) {
        const segments = path.split('/');
        if (!result) {
            result = segments;
            continue;
        }
        let i = 0;
        while (i < result.length && result[i] === segments[i]) {
            i++;
        }
        result = result.slice(0, i);
    }
    return result?.join('/') ?? '';
}

/**
 * Vite plugin to generate isolated declaration files for TypeScript sources.
 * @returns {import('vite').Plugin} The Vite plugin instance.
 */
export default function isolatedDeclPlugin() {
    /**
     * @type {Map<string, string>}
     */
    const declarations = new Map();

    return {
        name: 'vite-plugin-isolated-decl',

        enforce: 'pre',

        buildStart() {
            declarations.clear();
        },

        async buildEnd() {
            const { getOutputFileNames } = await import('typescript');
            const srcDir = commonDir([...declarations.keys()]);

            for (const [id, decl] of declarations) {
                const [outputPath] = getOutputFileNames(
                    {
                        errors: [],
                        fileNames: [id],
                        options: {
                            declaration: true,
                            emitDeclarationOnly: true,
                        },
                    },
                    id,
                    false
                );
                const relativePath = outputPath.replace(`${srcDir}/`, '');
                this.emitFile({
                    type: 'asset',
                    fileName: relativePath,
                    name: id,
                    source: decl,
                });
            }
        },

        transform: {
            filter: {
                id: [/\.(m|c)?tsx?$/],
            },
            async handler(code, id) {
                const { transpileDeclaration } = await import('typescript');
                const { outputText } = transpileDeclaration(code, {
                    fileName: id,
                    reportDiagnostics: false,
                });
                declarations.set(id, outputText);
            },
        },
    };
}
