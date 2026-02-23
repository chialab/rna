/**
 * @import { CustomElement, Export, Module, Package, Reference } from 'custom-elements-manifest'
 * @import { GenerateOptions } from './generate.js'
 * @import { SourceFile } from './source-file.js'
 */
import { generate } from './generate.js';
import { isBareModuleSpecifier } from './utils.js';

/**
 * @typedef {(from: string, to: string) => Promise<string | null> | string | null} ResolveFunction
 */

/**
 * @typedef {GenerateOptions & { resolve?: ResolveFunction }} BundleOptions
 */

/**
 * @param {Module[]} modules
 * @returns {(from: string, to: string) => string | null}
 */
function createResolve(modules) {
    const RESOLVE_VARIANTS = [
        '.js',
        '.mjs',
        '.cjs',
        '.jsx',
        '.ts',
        '.mts',
        '.cts',
        '.tsx',
        '/index.js',
        '/index.mjs',
        '/index.cjs',
        '/index.jsx',
        '/index.ts',
        '/index.mts',
        '/index.cts',
        '/index.tsx',
    ];

    return (from, to) => {
        if (to[0] !== '.' && to[0] !== '/') {
            return to;
        }

        const resolvedPath = new URL(to, `file://${from}`).pathname;

        for (const path of modules.map((m) => m.path) ?? []) {
            if (resolvedPath === path) {
                return path;
            }
            for (const variant of RESOLVE_VARIANTS) {
                if (resolvedPath + variant === path) {
                    return path;
                }
            }
        }

        return resolvedPath;
    };
}

/**
 * @param {Module} module
 * @param {{ resolve: ResolveFunction; manifest: Package }} options
 * @returns {Promise<Export[]>}
 */
async function resolveExports(module, { resolve, manifest }) {
    /** @type {Export[]} */
    const exports = [];
    if (!module.exports) {
        return exports;
    }
    for (const exp of module.exports) {
        if (exp.declaration.module === module.path) {
            exports.push(exp);
            continue;
        }
        const moduleName = exp.declaration.module ?? exp.declaration.package;
        if (!moduleName) {
            exports.push(exp);
            continue;
        }
        const resolved = await resolve(module.path, moduleName);
        if (!resolved) {
            exports.push(exp);
            continue;
        }
        const externalModule = manifest.modules?.find((m) => m.path === resolved);
        if (!externalModule) {
            exports.push(exp);
            continue;
        }
        const externalExports = await resolveExports(externalModule, {
            resolve,
            manifest,
        });
        if (exp.name === '*') {
            exports.push(...externalExports);
            continue;
        }
        exports.push({
            ...exp,
            declaration: {
                ...exp.declaration,
                module: externalModule.path,
            },
        });
    }
    return exports;
}

/**
 * @param {string} name
 * @param {Module} module
 * @returns {{ name: string; module: string } | null}
 */
function resolveExport(name, module) {
    let resolvedName = name;
    if (resolvedName === 'default') {
        if (!module.exports) {
            return null;
        }
        for (const exp of module.exports) {
            if (exp.name === 'default') {
                resolvedName = exp.declaration.name;
                break;
            }
        }
    }
    if (!module.declarations) {
        return null;
    }

    for (const declaration of module.declarations) {
        if (declaration.name === resolvedName) {
            return {
                name: declaration.name,
                module: module.path,
            };
        }
    }

    return null;
}

/**
 * @param {Record<string, SourceFile[]>} modules
 * @param {BundleOptions} [options={}]
 * @returns {Promise<Package>}
 */
export async function bundle(modules, options = {}) {
    /** @type {Package} */
    const bundle = {
        schemaVersion: '2.1.0',
        modules: [],
    };
    for (const [packageName, sourceFiles] of Object.entries(modules)) {
        const manifest = await generate(sourceFiles, {
            ...options,
            thirdPartyManifests: [...(options.thirdPartyManifests || []), bundle],
        });
        const [entrypoint, ...entries] = manifest.modules || [];
        if (!entrypoint) {
            continue;
        }
        /** @type {Module} */
        const mod = {
            ...structuredClone(entrypoint),
            kind: 'javascript-module',
            path: packageName,
            exports: [],
        };
        bundle.modules?.push(mod);

        // collect all symbols
        /** @type {Map<string, Map<string, string>>} */
        const renames = new Map();
        const symbols = new Set(mod.declarations?.map((declaration) => declaration.name) ?? []);
        for (const module of entries) {
            /** @type {Map<string, string>} */
            const renamed = new Map();
            renames.set(module.path, renamed);

            if (!module.declarations) {
                continue;
            }

            for (const declaration of module.declarations) {
                let name = declaration.name;
                let i = 1;
                while (symbols.has(name)) {
                    name = `${declaration.name}${i++}`;
                }

                renamed.set(declaration.name, name);
                const clone = Object.assign(structuredClone(declaration), {
                    name,
                });

                mod.declarations ??= [];
                mod.declarations.push(clone);
                symbols.add(name);
            }
        }
        symbols.clear();

        if (!mod.declarations) {
            continue;
        }

        // resolve dependencies
        const resolve = options.resolve ?? createResolve(manifest.modules ?? []);
        for (const declaration of mod.declarations) {
            if (declaration.kind !== 'class') {
                continue;
            }

            const members = /** @type {Reference[]} */ (
                [...(declaration.members ?? []).map((m) => m.inheritedFrom), declaration.superclass].filter(Boolean)
            );

            if ('customElement' in declaration) {
                const customElementDeclaration = /** @type {CustomElement} */ (declaration);
                members.push(
                    .../** @type {Reference[]} */ (
                        (customElementDeclaration.attributes ?? []).map((m) => m.inheritedFrom).filter(Boolean)
                    ),
                    .../** @type {Reference[]} */ (
                        (customElementDeclaration.events ?? []).map((m) => m.inheritedFrom).filter(Boolean)
                    ),
                    .../** @type {Reference[]} */ ((customElementDeclaration.slots ?? []).filter(Boolean))
                );
            }

            for (const reference of members) {
                const moduleName = reference.module ?? reference.package;
                if (!moduleName) {
                    continue;
                }
                const path = await resolve(entrypoint.path, moduleName);
                if (!path || !isBareModuleSpecifier(path)) {
                    continue;
                }

                const renamed = renames.get(path);
                const name = renamed?.get(reference.name) ?? reference.name;

                reference.name = name;
                reference.package = path;
                reference.module = undefined;
            }
        }

        // collect exports
        const exports = await resolveExports(entrypoint, { resolve, manifest });
        for (const exp of exports) {
            if (exp.declaration.package) {
                mod.exports ??= [];
                mod.exports.push(exp);
                continue;
            }

            if (!exp.declaration.module) {
                mod.exports ??= [];
                mod.exports.push(exp);
                continue;
            }

            const externalModule = manifest.modules?.find((m) => m.path === exp.declaration.module);
            if (!externalModule) {
                continue;
            }

            const externalExport = resolveExport(exp.declaration.name, externalModule);
            if (!externalExport) {
                continue;
            }

            const renamed = renames.get(externalModule.path);
            const declarationName = renamed?.get(externalExport.name) ?? externalExport.name;

            mod.exports ??= [];
            mod.exports.push({
                ...exp,
                declaration: {
                    name: declarationName ?? externalExport.name,
                    package: mod.path,
                },
            });
        }
    }
    return bundle;
}
