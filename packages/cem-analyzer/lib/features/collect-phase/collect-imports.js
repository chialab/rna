/** @import { Plugin } from '../../generate.js' */
import { isBareModuleSpecifier } from '../../utils.js';

/**
 * COLLECT-IMPORTS
 *
 * Collects a modules imports so that declarations can later be resolved to their module/package.
 */
/** @returns {Plugin} */
export function collectImportsPlugin() {
    return {
        name: 'CORE - IMPORTS',
        collectPhase({ node }) {
            if (node.type === 'Program') {
                this.resetImports();
            }

            /**
             * @example import defaultExport from 'foo';
             */
            if (
                node.type === 'ImportDeclaration' &&
                node.specifiers.some((specifier) => specifier.type === 'ImportDefaultSpecifier')
            ) {
                this.collectImport({
                    kind: 'default',
                    path: node.source.value,
                    name: node.specifiers.find((specifier) => specifier.type === 'ImportDefaultSpecifier')?.local.name,
                    isBareModuleSpecifier: isBareModuleSpecifier(node.source.value),
                    isTypeOnly: node?.importKind === 'type',
                });
            }

            /**
             * @example import { export1, export2 } from 'foo';
             * @example import { export1 as alias1 } from 'foo';
             * @example import { export1, export2 as alias2 } from 'foo';
             */
            if (
                node.type === 'ImportDeclaration' &&
                node.specifiers.some((specifier) => specifier.type === 'ImportSpecifier')
            ) {
                node.specifiers.forEach((element) => {
                    if (element.type !== 'ImportSpecifier') {
                        return;
                    }
                    this.collectImport({
                        kind: 'named',
                        path: node.source.value,
                        name: element.local.name,
                        isBareModuleSpecifier: isBareModuleSpecifier(node.source.value),
                        isTypeOnly: element?.importKind === 'type',
                    });
                });
            }

            /**
             * @example import * as name from './my-module.js';
             */
            if (
                node.type === 'ImportDeclaration' &&
                node.specifiers.some((specifier) => specifier.type === 'ImportNamespaceSpecifier')
            ) {
                this.collectImport({
                    kind: 'aggregate',
                    path: node.source.value,
                    name: node.specifiers.find((specifier) => specifier.type === 'ImportNamespaceSpecifier')?.local
                        .name,
                    isBareModuleSpecifier: isBareModuleSpecifier(node.source.value),
                    isTypeOnly: node?.importKind === 'type',
                });
            }

            /**
             * @example import './my-module.js';
             */
            if (node.type === 'ImportDeclaration' && node.specifiers.length === 0) {
                this.collectImport({
                    kind: 'side-effect',
                    path: node.source.value,
                    isBareModuleSpecifier: isBareModuleSpecifier(node.source.value),
                    isTypeOnly: false,
                });
            }
        },
    };
}
