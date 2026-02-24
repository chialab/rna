/**
 * @import { ClassDeclaration, Declaration, FunctionDeclaration, Module, Package, VariableDeclaration } from 'custom-elements-manifest'
 * @import { SourceFile } from './source-file.js'
 * @import { Node } from '@oxc-project/types'
 * @import { Block } from 'comment-parser'
 */
import { arrowFunctionPlugin } from './features/analyse-phase/arrow-function.js';
import { classPlugin } from './features/analyse-phase/classes.js';
import { customElementDecoratorPlugin } from './features/analyse-phase/custom-element-decorator.js';
import { customElementsDefineCallsPlugin } from './features/analyse-phase/custom-elements-define-calls.js';
import { exportsPlugin } from './features/analyse-phase/exports.js';
import { functionLikePlugin } from './features/analyse-phase/function-like.js';
import { variablePlugin } from './features/analyse-phase/variables.js';
import { collectImportsPlugin } from './features/collect-phase/collect-imports.js';
import { cleanupClassesPlugin } from './features/link-phase/cleanup-classes.js';
import { fieldDenyListPlugin } from './features/link-phase/field-denylist.js';
import { methodDenyListPlugin } from './features/link-phase/method-denylist.js';
import { applyInheritancePlugin } from './features/post-processing/apply-inheritance.js';
import { isCustomElementPlugin } from './features/post-processing/is-custom-element.js';
import { linkClassToTagnamePlugin } from './features/post-processing/link-class-to-tagname.js';
import { removeUnexportedDeclarationsPlugin } from './features/post-processing/remove-unexported-declarations.js';
import { sortMembersPlugin } from './features/post-processing/sort-members.js';
import { createResolve } from './resolve.js';
import { isBareModuleSpecifier, iterateCallbacks, parseJSDoc, print } from './utils.js';
import { ANY_CHILD, walk } from './walker.js';

/**
 * @typedef {"default" | "named" | "aggregate" | "side-effect"} ImportKind
 */

/**
 * @typedef {Object} ImportData
 * @property {ImportKind} kind
 * @property {string} path
 * @property {string} [name]
 * @property {boolean} isBareModuleSpecifier
 * @property {boolean} isTypeOnly
 */

/**
 * @typedef {"class" | "variable" | "function" | undefined} DeclatationType
 */

/**
 * @template {DeclatationType} T
 * @typedef {T extends "class"
 *   ? ClassDeclaration
 *   : T extends "variable"
 *     ? VariableDeclaration
 *     : T extends "function"
 *       ? FunctionDeclaration
 *       : Declaration} DeclarationByType
 */

/**
 * @typedef {(source: string, importer: string) => Promise<string | null> | string | null} ResolveFunction
 */

/**
 * @typedef {Object} Context
 * @property {() => SourceFile} getSourceFile
 * @property {() => void} resetImports
 * @property {(source: string) => string | null | Promise<string | null>} resolve
 * @property {(specifier: string | Declaration) => { module: string } | { package: string } | null} resolveModuleOrPackageSpecifier
 * @property {(importData: ImportData) => void} collectImport
 * @property {typeof walk} walk
 * @property {(node: Node) => string} print
 * @property {(node: Node) => Block[]} parseJSDoc
 * @property {(name: string) => Node | null} getNodeByName
 * @property {<T extends DeclatationType>(name: string, kind: T, source: string | Module) => DeclarationByType<T> | null} resolveDeclaration
 * @property {(declaration: Declaration) => Module | null} getDeclarationModule
 * @property {() => Package[]} getManifests
 */

/**
 * @typedef {Object} Plugin
 * @property {string} name
 * @property {(this: Context, data: { sourceFiles: SourceFile[]; customElementsManifest: Package }) => void | Promise<void>} [initialize]
 * @property {(this: Context, data: { node: Node; moduleDoc: Module; customElementsManifest: Package }) => void | Promise<void>} [collectPhase]
 * @property {(this: Context, data: { node: Node; moduleDoc: Module; customElementsManifest: Package }) => void | Promise<void>} [analyzePhase]
 * @property {(this: Context, data: { moduleDoc: Module; customElementsManifest: Package }) => void | Promise<void>} [moduleLinkPhase]
 * @property {(this: Context, data: { customElementsManifest: Package }) => void | Promise<void>} [packageLinkPhase]
 */

/**
 * @typedef {Object} GenerateOptions
 * @property {Plugin[]} [plugins]
 * @property {Package[]} [thirdPartyManifests]
 * @property {ResolveFunction} [resolve]
 */

/**
 * Executes a plugin callback and rethrows failures with plugin context.
 * @param {string} name - The plugin name.
 * @param {() => void | Promise<void>} cb - The callback to execute.
 * @returns {void | Promise<void>}
 */
function withErrorHandling(name, cb) {
    /** @param {unknown} e */
    const handleError = (e) => {
        const errorMessage = e instanceof Error ? e.message : String(e);

        throw new Error(`Error in plugin ${name ?? 'unnamed-plugin'}: ${errorMessage}`, { cause: e });
    };

    try {
        const result = cb();
        if (result instanceof Promise) {
            return result.catch(handleError);
        }
    } catch (e) {
        handleError(e);
    }
}

/** @type {Plugin[]} */
export const corePlugins = [
    /** COLLECT */
    collectImportsPlugin(),
    /** ANALYSE */
    exportsPlugin(),
    customElementsDefineCallsPlugin(),
    customElementDecoratorPlugin(),
    functionLikePlugin(),
    arrowFunctionPlugin(),
    classPlugin(),
    variablePlugin(),
    /** LINK */
    methodDenyListPlugin(),
    fieldDenyListPlugin(),
    cleanupClassesPlugin(),
    /** POST-PROCESSING */
    linkClassToTagnamePlugin(),
    isCustomElementPlugin(),
    applyInheritancePlugin(),
    removeUnexportedDeclarationsPlugin(),
    sortMembersPlugin(),
];

/**
 * Generates a custom elements manifest from source files.
 * @param {SourceFile[]} sourceFiles - Source files to analyze.
 * @param {GenerateOptions} [options={}] - Generation options.
 * @returns {Promise<Package>} The generated manifest.
 */
export async function generate(sourceFiles, options = {}) {
    /** @type {Package} */
    const customElementsManifest = {
        schemaVersion: '2.1.0',
        readme: '',
        modules: [],
    };

    const resolve = options.resolve ?? createResolve(sourceFiles);
    const plugins = [...corePlugins, ...(options.plugins || [])];
    /** @type {SourceFile} */
    let currentSourceFile;
    /** @type {Node[]} */
    let flatProgramNodes;

    /** @type {Map<SourceFile, ImportData[]>} */
    const importsMap = new Map();
    /** @type {Context} */
    const context = {
        getSourceFile() {
            return currentSourceFile;
        },
        resetImports() {
            importsMap.set(this.getSourceFile(), []);
        },
        resolve(source) {
            return resolve(source, this.getSourceFile().fileName);
        },
        resolveModuleOrPackageSpecifier(specifier) {
            if (typeof specifier === 'string') {
                const imports = importsMap.get(this.getSourceFile()) || [];
                const foundImport = imports.find((_import) => _import.name === specifier);
                if (foundImport?.isBareModuleSpecifier) {
                    /* import is from 3rd party package */
                    return { package: foundImport.path };
                }
                if (foundImport) {
                    return { module: foundImport.path };
                }
                return null;
            }
            for (const manifest of context.getManifests()) {
                for (const module of manifest.modules) {
                    if (module.declarations?.some((decl) => decl === specifier)) {
                        if (isBareModuleSpecifier(module.path)) {
                            return { package: module.path };
                        }
                        return { module: module.path };
                    }
                }
            }
            return null;
        },
        /**
         * Adds an import for the current source file.
         * @param {ImportData} importData - Import metadata.
         */
        collectImport(importData) {
            const sourceFile = this.getSourceFile();
            if (!importsMap.has(sourceFile)) {
                importsMap.set(sourceFile, []);
            }
            importsMap.get(sourceFile)?.push(importData);
        },
        /**
         * Reads the nearest JSDoc block associated with a node.
         * @param {Node} node - The node to inspect.
         * @returns {Block[]}
         */
        parseJSDoc(node) {
            let targetNode = node;
            if (currentSourceFile.comments.length === 0) {
                return [];
            }
            let io = flatProgramNodes.indexOf(targetNode);
            if (targetNode.type === 'VariableDeclarator') {
                while (targetNode && targetNode?.type !== 'VariableDeclaration') {
                    targetNode = flatProgramNodes[--io];
                }
            }
            if (!targetNode || io === -1) {
                return [];
            }
            const prevNode = flatProgramNodes[io - 1];
            if (
                prevNode?.type === 'ExportNamedDeclaration' ||
                prevNode?.type === 'ExportDefaultDeclaration' ||
                prevNode?.type === 'ExportAllDeclaration' ||
                prevNode?.type === 'ExpressionStatement'
            ) {
                return this.parseJSDoc(prevNode);
            }

            let prev = 0;
            if (prevNode) {
                if (prevNode.type === 'Program') {
                    prev = 0;
                } else if (prevNode.end > targetNode.start) {
                    prev = prevNode.start;
                } else {
                    prev = prevNode.end;
                }
            }

            return parseJSDoc(currentSourceFile, targetNode.start, prev);
        },
        walk,
        print,
        getNodeByName(name) {
            /**
             * @param {Node} node
             * @returns {boolean}
             */
            const findNode = (node) => {
                if (node.type === 'VariableDeclaration') {
                    return node.declarations.some(
                        (declaration) => declaration.id.type === 'Identifier' && declaration.id.name === name
                    );
                }
                if (node.type === 'FunctionDeclaration') {
                    return !!node.id && node.id.name === name;
                }
                if (node.type === 'ClassDeclaration') {
                    return !!node.id && node.id.name === name;
                }
                if (node.type === 'ExportNamedDeclaration') {
                    return !!node.declaration && findNode(node.declaration);
                }
                return false;
            };

            return this.getSourceFile().program.body.find((statement) => findNode(statement)) ?? null;
        },
        /**
         * @template {DeclatationType} T
         * @param {string} name
         * @param {T} kind
         * @param {string | Module} source
         * @returns {DeclarationByType<T> | null}
         */
        resolveDeclaration(name, kind, source) {
            for (const manifest of context.getManifests()) {
                for (const module of manifest.modules) {
                    if (typeof source === 'string' ? module.path !== source : module !== source) {
                        continue;
                    }
                    if (module.exports) {
                        for (const exp of module.exports) {
                            const specifier = exp.declaration.module || exp.declaration.package;
                            if (exp.name === name) {
                                if (specifier) {
                                    return context.resolveDeclaration(exp.declaration.name, kind, specifier);
                                }

                                const declaration = module.declarations?.find(
                                    (decl) => decl.name === exp.declaration.name && (kind ? decl.kind === kind : true)
                                );
                                if (declaration) {
                                    return /** @type {DeclarationByType<T>} */ (declaration);
                                }
                            } else if (exp.name === '*' && specifier) {
                                const declaration = context.resolveDeclaration(name, kind, specifier);
                                if (declaration) {
                                    return declaration;
                                }
                            }
                        }
                    }
                }
            }
            return null;
        },
        getDeclarationModule(declaration) {
            for (const manifest of context.getManifests()) {
                for (const module of manifest.modules) {
                    if (module.declarations?.some((decl) => decl === declaration)) {
                        return module;
                    }
                }
            }
            return null;
        },
        getManifests() {
            return [...(options.thirdPartyManifests || []), customElementsManifest];
        },
    };

    await iterateCallbacks(
        plugins.map(
            (plugin) => () =>
                withErrorHandling(plugin.name, () =>
                    plugin.initialize?.call(context, {
                        customElementsManifest,
                        sourceFiles,
                    })
                )
        )
    );

    const walkerOptions = {
        ignoreBranches: {
            ArrowFunctionExpression: ANY_CHILD,
            FunctionDeclaration: ANY_CHILD,
            FunctionExpression: ANY_CHILD,
            VariableDeclarator: ANY_CHILD,
            ClassDeclaration: ANY_CHILD,
            ClassExpression: ANY_CHILD,
            ImportDeclaration: ANY_CHILD,
            ExportAllDeclaration: ANY_CHILD,
            ExportSpecifier: ANY_CHILD,
            CallExpression: ANY_CHILD,
            TSTypeAliasDeclaration: ANY_CHILD,
            TSInterfaceDeclaration: ANY_CHILD,
            TSModuleDeclaration: ANY_CHILD,
        },
    };

    for (currentSourceFile of sourceFiles) {
        flatProgramNodes = [];

        /** @type {Module} */
        const moduleDoc = {
            kind: 'javascript-module',
            path: currentSourceFile.fileName,
            declarations: [],
            exports: [],
        };

        walk(currentSourceFile.program, (node) => {
            flatProgramNodes.push(node);
        });

        await walk(
            currentSourceFile.program,
            (node) =>
                iterateCallbacks(
                    plugins.map(
                        (plugin) => () =>
                            withErrorHandling(plugin.name, () =>
                                plugin.collectPhase?.call(context, {
                                    node,
                                    moduleDoc,
                                    customElementsManifest,
                                })
                            )
                    )
                ),
            walkerOptions
        );

        await walk(
            currentSourceFile.program,
            (node) =>
                iterateCallbacks(
                    plugins.map(
                        (plugin) => () =>
                            withErrorHandling(plugin.name, () =>
                                plugin.analyzePhase?.call(context, {
                                    node,
                                    moduleDoc,
                                    customElementsManifest,
                                })
                            )
                    )
                ),
            walkerOptions
        );

        customElementsManifest.modules.push(moduleDoc);

        await iterateCallbacks(
            plugins.map(
                (plugin) => () =>
                    withErrorHandling(plugin.name, () =>
                        plugin.moduleLinkPhase?.call(context, {
                            moduleDoc,
                            customElementsManifest,
                        })
                    )
            )
        );
    }

    await iterateCallbacks(
        plugins.map(
            (plugin) => () =>
                withErrorHandling(plugin.name, () => plugin.packageLinkPhase?.call(context, { customElementsManifest }))
        )
    );

    return customElementsManifest;
}
