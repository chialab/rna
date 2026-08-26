/**
 * @import { Plugin, FilterPattern } from 'vite';
 * @import * as typescript from 'typescript';
 * @import * as rolldown from 'rolldown/experimental';
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createFilter, parseSync } from 'vite';

/**
 * The plugin context available during the build phase.
 * @typedef {ThisParameterType<Extract<NonNullable<Plugin['buildStart']>, Function>>} PluginContext
 */

/**
 * Matches TypeScript sources, the only files that can be transpiled to declarations.
 */
const TS_SOURCE_RE = /\.(m|c)?tsx?$/;

/**
 * Matches TypeScript declaration files, which are emitted as-is.
 */
const DECLARATION_RE = /\.d\.(m|c)?ts$/;

/**
 * Matches `import('...')` type nodes and `import x = require('...')` statements.
 */
const IMPORT_CALL_RE = /\b(?:import|require)\s*\(\s*['"]([^'"]+)['"]/g;

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
    if (DECLARATION_RE.test(path)) {
        return path;
    }
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
    const ts = /** @type {typeof typescript | null} */ (await tryImport('typescript'));
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
    const rd = /** @type {typeof rolldown | null} */ (await tryImport('rolldown/experimental'));
    if (!rd) {
        return false;
    }
    return (await rd.isolatedDeclaration(id, code)).code;
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
 * Collects the module specifiers referenced by a declaration file.
 * Type-only imports are erased before the bundler resolves them, so the emitted
 * declarations are the only place where those dependencies are still visible.
 * @param {string} code The declaration code to analyze.
 * @param {string} id The identifier (file path) of the declaration source.
 * @returns {Promise<string[]>} The referenced module specifiers.
 */
async function collectSpecifiers(code, id) {
    const { module } = parseSync(id, code, { lang: 'ts' });
    const specifiers = module.staticImports.map(({ moduleRequest }) => moduleRequest.value);
    for (const { entries } of module.staticExports) {
        for (const { moduleRequest } of entries) {
            if (moduleRequest) {
                specifiers.push(moduleRequest.value);
            }
        }
    }
    for (const [, specifier] of code.matchAll(IMPORT_CALL_RE)) {
        specifiers.push(specifier);
    }
    return specifiers;
}

/**
 * Vite plugin to generate isolated declaration files for TypeScript sources.
 * @param {{ include?: FilterPattern; exclude?: FilterPattern; outDir?: string }} [options] Optional configuration for the plugin (currently unused).
 * @returns {Plugin} The Vite plugin instance.
 */
export default function isolatedDeclPlugin(options = {}) {
    const filter = createFilter(options.include, options.exclude);

    /**
     * @type {Map<string, Promise<string>>}
     */
    const declarations = new Map();

    /**
     * Resolves a module specifier to a local TypeScript source eligible for declaration emit.
     * @param {PluginContext} ctx The plugin context.
     * @param {string} specifier The module specifier to resolve.
     * @param {string} importer The file that references the specifier.
     * @returns {Promise<string | null>} The resolved file path, or null when it should be skipped.
     */
    async function resolveSource(ctx, specifier, importer) {
        const resolved = await ctx.resolve(specifier, importer);
        if (!resolved || resolved.external) {
            return null;
        }
        const [id] = resolved.id.split('?');
        if (id.includes('\0') || id.includes('/node_modules/') || !TS_SOURCE_RE.test(id) || !filter(id)) {
            return null;
        }
        return id;
    }

    /**
     * Generates the declaration of a source file, then walks the dependencies of the
     * generated declaration in order to reach files that are only imported as types
     * and therefore never hit the `transform` hook.
     * @param {PluginContext} ctx The plugin context.
     * @param {string} id The source file path.
     * @param {string} [code] The source code, when already available.
     * @returns {Promise<string>} The declaration code of the given file.
     */
    function collect(ctx, id, code) {
        const cached = declarations.get(id);
        if (cached) {
            return cached;
        }

        const declaration = Promise.resolve(code ?? readFile(id, 'utf-8')).then((source) =>
            DECLARATION_RE.test(id) ? source : transpile(source, id)
        );
        declarations.set(id, declaration);

        return declaration.then(async (decl) => {
            const specifiers = await collectSpecifiers(decl, id);
            await Promise.all(
                specifiers.map(async (specifier) => {
                    const dependency = await resolveSource(ctx, specifier, id);
                    if (!dependency || declarations.has(dependency)) {
                        return;
                    }
                    ctx.addWatchFile(dependency);
                    await collect(ctx, dependency);
                })
            );
            return decl;
        });
    }

    return {
        name: 'vite-plugin-isolated-decl',

        enforce: 'pre',

        buildStart() {
            declarations.clear();
        },

        async buildEnd() {
            const entries = await Promise.all(
                [...declarations].map(
                    async ([id, declaration]) => /** @type {[string, string]} */ ([id, await declaration])
                )
            );
            const srcDir = commonDir(entries.map(([id]) => id.split('/').slice(0, -1).join('/')));

            for (const [id, decl] of entries) {
                const outputPath = getDeclarationFilerName(id);
                const relativePath = outputPath.replace(`${srcDir}/`, '');
                this.emitFile({
                    type: 'asset',
                    fileName: options.outDir ? join(options.outDir, relativePath) : relativePath,
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
                if (!filter(id)) {
                    return null;
                }
                await collect(this, id, code);
            },
        },
    };
}
