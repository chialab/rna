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
 * Determines the declaration emit extension (.d.ts, .d.mts, .d.cts)
 * based on the source file path.
 * @param {string} path The source file path.
 * @returns {string} The appropriate declaration file extension.
 */
function getDeclarationFilerName(path) {
    const [fileName, ext] = path.split(/\.([^.]+)$/);
    if (ext === 'mts' || ext === 'mjs') {
        return `${fileName}.d.mts`;
    }
    if (ext === 'cts' || ext === 'cjs') {
        return `${fileName}.d.cts`;
    }
    return `${fileName}.d.ts`;
}

/**
 * @type {Map<string, Promise<unknown>>}
 */
const importCache = new Map();

/**
 * Attempts to dynamically import a module and returns null if the module is not found.
 * @param {string} moduleName The name of the module to import.
 * @returns {Promise<unknown>} The imported module or null if not found.
 */
async function tryImport(moduleName) {
    const loadPromise =
        importCache.get(moduleName) ||
        import(moduleName).catch((err) => {
            if (/** @type {{ code?: string }} */ (err).code === 'ERR_MODULE_NOT_FOUND') {
                return null;
            }
            throw err;
        });
    importCache.set(moduleName, loadPromise);
    return await loadPromise;
}

/**
 * Transpiles code to declaration files using Typescript.
 * @param {string} code The TypeScript source code to transpile.
 * @param {string} id The identifier (file path) of the source code.
 * @returns {Promise<string | false>} The transpiled declaration code.
 */
async function typescriptTranspile(code, id) {
    const ts = /** @type {typeof import('typescript') | null} */ (await tryImport('typescript'));
    if (!ts) {
        return false;
    }
    return ts.transpileDeclaration(code, {
        fileName: id,
        reportDiagnostics: false,
    }).outputText;
}

/**
 * Transpiles code to declaration files using Rolldown.
 * @param {string} code The TypeScript source code to transpile.
 * @param {string} id The identifier (file path) of the source code.
 * @returns {Promise<string | false>} The transpiled declaration code.
 */
async function rolldownTranspile(code, id) {
    const rolldown = /** @type {typeof import('rolldown/experimental') | null} */ (
        await tryImport('rolldown/experimental')
    );
    if (!rolldown) {
        return false;
    }
    return (await rolldown.isolatedDeclaration(id, code)).code;
}

/**
 * Transpiles code to declaration files.
 * @param {string} code The TypeScript source code to transpile.
 * @param {string} id The identifier (file path) of the source code.
 * @returns {Promise<string>} The transpiled declaration code.
 */
async function transpile(code, id) {
    const result = (await rolldownTranspile(code, id)) || (await typescriptTranspile(code, id));
    if (result === false) {
        throw new Error('No transpiler available for generating declaration files.');
    }
    return result;
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

        buildEnd() {
            const srcDir = commonDir([...declarations.keys()].map((id) => id.split('/').slice(0, -1).join('/')));

            for (const [id, decl] of declarations) {
                const outputPath = getDeclarationFilerName(id);
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
                declarations.set(id, await transpile(code, id));
            },
        },
    };
}
