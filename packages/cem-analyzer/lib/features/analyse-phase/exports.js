/**
 * @import { Export } from 'custom-elements-manifest'
 * @import { Plugin } from '../../generate.js'
 */
import { hasIgnoreJSDoc, isBareModuleSpecifier } from '../../utils.js';

/**
 * EXPORTS
 *
 * Analyzes a modules exports and adds them to the moduleDoc
 */
/** @returns {Plugin} */
export function exportsPlugin() {
    return {
        name: 'CORE - EXPORTS',
        analyzePhase({ node, moduleDoc }) {
            /**
             * @example export const foo = '';
             */
            if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'VariableDeclaration') {
                const jsdoc = this.parseJSDoc(node);
                if (hasIgnoreJSDoc(jsdoc)) {
                    return;
                }

                node.declaration.declarations.forEach((declaration) => {
                    if (declaration.id?.type !== 'Identifier') {
                        return;
                    }
                    /** @type {Export} */
                    const _export = {
                        kind: 'js',
                        name: declaration.id.name,
                        declaration: {
                            name: declaration.id.name,
                            ...this.resolveModuleOrPackageSpecifier(declaration.id.name),
                        },
                    };

                    moduleDoc.exports ??= [];
                    moduleDoc.exports.push(_export);
                });
            }

            /**
             * @example export default var1;
             */
            if (node.type === 'ExportDefaultDeclaration' && node.declaration.type === 'Identifier') {
                const jsdoc = this.parseJSDoc(node);
                if (hasIgnoreJSDoc(jsdoc)) {
                    return;
                }

                /** @type {Export} */
                const _export = {
                    kind: 'js',
                    name: 'default',
                    declaration: {
                        name: node.declaration.name,
                        ...this.resolveModuleOrPackageSpecifier(node.declaration.name),
                    },
                };
                moduleDoc.exports ??= [];
                moduleDoc.exports.push(_export);
            }

            /**
             * @example export { var1, var2 };
             */
            if (node.type === 'ExportNamedDeclaration' && !node.source) {
                const jsdoc = this.parseJSDoc(node);
                if (hasIgnoreJSDoc(jsdoc)) {
                    return;
                }

                node.specifiers.forEach((element) => {
                    if (element.exported.type !== 'Identifier' || element.local.type !== 'Identifier') {
                        return;
                    }
                    const jsdoc = this.parseJSDoc(element);
                    if (hasIgnoreJSDoc(jsdoc)) {
                        return;
                    }
                    const declaration = this.getNodeByName(element.local.name);
                    if (!declaration) {
                        return;
                    }
                    const jsdocDecl = this.parseJSDoc(declaration);
                    if (hasIgnoreJSDoc(jsdocDecl)) {
                        return;
                    }

                    /** @type {Export} */
                    const _export = {
                        kind: 'js',
                        name: element.exported.name,
                        declaration: {
                            name: element.local.name,
                            ...this.resolveModuleOrPackageSpecifier(element.local.name),
                        },
                    };

                    moduleDoc.exports ??= [];
                    moduleDoc.exports.push(_export);
                });
            }

            /**
             * @example export * from 'foo';
             * @example export * from './my-module.js';
             * @example export * as foo from 'foo';
             * @example export * as foo from './my-module.js';
             */
            if (node.type === 'ExportAllDeclaration' && (!node.exported || node.exported.type === 'Identifier')) {
                const jsdoc = this.parseJSDoc(node);
                if (hasIgnoreJSDoc(jsdoc)) {
                    return;
                }

                const specifier = node.source.value.replace(/'/g, '').replace(/"/g, '');
                const exportedName = node.exported ? node.exported.name : '*';
                return Promise.resolve()
                    .then(() => this.resolve(specifier))
                    .then((path) => {
                        const isBare = isBareModuleSpecifier(path || specifier);

                        /** @type {Export} */
                        const _export = {
                            kind: 'js',
                            name: '*',
                            declaration: {
                                name: exportedName,
                                ...(isBare
                                    ? { package: path || specifier }
                                    : {
                                          module: path || specifier,
                                      }),
                            },
                        };
                        moduleDoc.exports ??= [];
                        moduleDoc.exports.push(_export);
                    });
            }

            /**
             * @example export { var1, var2 } from 'foo';
             * @example export { var1, var2 } from './my-module.js';
             */
            if (node.type === 'ExportNamedDeclaration' && !!node.source) {
                const jsdoc = this.parseJSDoc(node);
                if (hasIgnoreJSDoc(jsdoc)) {
                    return;
                }

                node.specifiers.forEach((element) => {
                    if (!node.source || element.exported.type !== 'Identifier' || element.local.type !== 'Identifier') {
                        return;
                    }

                    /** @type {Export} */
                    const _export = {
                        kind: 'js',
                        name: element.exported.name,
                        declaration: {
                            name: element.local.name,
                        },
                    };

                    if (isBareModuleSpecifier(node.source.value)) {
                        _export.declaration.package = node.source.value.replace(/'/g, '').replace(/"/g, '');
                    } else {
                        _export.declaration.module = node.source.value.replace(/'/g, '').replace(/"/g, '');
                    }

                    moduleDoc.exports ??= [];
                    moduleDoc.exports.push(_export);
                });
            }

            /**
             * @example export function foo() {}
             */
            if (
                node.type === 'ExportNamedDeclaration' &&
                node.declaration?.type === 'FunctionDeclaration' &&
                node.declaration.id?.type === 'Identifier'
            ) {
                const jsdoc = this.parseJSDoc(node);
                if (hasIgnoreJSDoc(jsdoc)) {
                    return;
                }

                /** @type {Export} */
                const _export = {
                    kind: 'js',
                    name: node.declaration.id.name,
                    declaration: {
                        name: node.declaration.id.name,
                        ...this.resolveModuleOrPackageSpecifier(node.declaration.id.name),
                    },
                };

                moduleDoc.exports ??= [];
                moduleDoc.exports.push(_export);
            }

            /**
             * @example export default function foo() {}
             */
            if (
                node.type === 'ExportDefaultDeclaration' &&
                node.declaration.type === 'FunctionDeclaration' &&
                node.declaration.id?.type === 'Identifier'
            ) {
                const jsdoc = this.parseJSDoc(node);
                if (hasIgnoreJSDoc(jsdoc)) {
                    return;
                }

                /** @type {Export} */
                const _export = {
                    kind: 'js',
                    name: 'default',
                    declaration: {
                        name: node.declaration.id.name,
                        ...this.resolveModuleOrPackageSpecifier(node.declaration.id.name),
                    },
                };

                moduleDoc.exports ??= [];
                moduleDoc.exports.push(_export);
            }

            /**
             * @example export class Class1 {}
             */
            if (
                node.type === 'ExportNamedDeclaration' &&
                node.declaration?.type === 'ClassDeclaration' &&
                node.declaration.id?.type === 'Identifier'
            ) {
                const jsdoc = this.parseJSDoc(node);
                if (hasIgnoreJSDoc(jsdoc)) {
                    return;
                }

                /** @type {Export} */
                const _export = {
                    kind: 'js',
                    name: node.declaration.id.name,
                    declaration: {
                        name: node.declaration.id.name,
                        ...this.resolveModuleOrPackageSpecifier(node.declaration.id.name),
                    },
                };
                moduleDoc.exports ??= [];
                moduleDoc.exports.push(_export);
            }

            /**
             * @example export default class Class1 {}
             */
            if (
                node.type === 'ExportDefaultDeclaration' &&
                node.declaration?.type === 'ClassDeclaration' &&
                node.declaration.id?.type === 'Identifier'
            ) {
                const jsdoc = this.parseJSDoc(node);
                if (hasIgnoreJSDoc(jsdoc)) {
                    return;
                }

                /** @type {Export} */
                const _export = {
                    kind: 'js',
                    name: 'default',
                    declaration: {
                        name: node.declaration.id.name,
                        ...this.resolveModuleOrPackageSpecifier(node.declaration.id.name),
                    },
                };
                moduleDoc.exports ??= [];
                moduleDoc.exports.push(_export);
            }
        },
    };
}
