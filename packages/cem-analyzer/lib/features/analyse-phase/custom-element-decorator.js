/**
 * @import { CallExpression } from '@oxc-project/types'
 * @import { CustomElementExport } from 'custom-elements-manifest'
 * @import { Plugin } from '../../generate.js'
 */

/**
 * CUSTOMELEMENT
 *
 * Handles the customElement decorator
 * @example @customElement('my-el');
 */
/** @returns {Plugin} */
export function customElementDecoratorPlugin() {
    return {
        name: 'CORE - CUSTOM-ELEMENT-DECORATOR',
        analyzePhase({ node, moduleDoc }) {
            if (node.type !== 'ClassDeclaration' || node.id?.type !== 'Identifier') {
                return;
            }

            const customElementDecorator = node.decorators?.find(
                (dec) =>
                    dec.expression.type === 'CallExpression' &&
                    dec.expression.callee.type === 'Identifier' &&
                    dec.expression.callee.name === 'customElement'
            );

            if (!customElementDecorator) {
                return;
            }

            const className = node.id.name;
            const tagNameArg = /** @type {CallExpression} */ (customElementDecorator.expression).arguments?.[0];
            if (tagNameArg?.type !== 'Literal') {
                return;
            }

            /** @type {CustomElementExport} */
            const definitionDoc = {
                kind: 'custom-element-definition',
                name: String(tagNameArg.value),
                declaration: {
                    name: className,
                    ...this.resolveModuleOrPackageSpecifier(className),
                },
            };

            moduleDoc.exports ??= [];
            moduleDoc.exports.push(definitionDoc);
        },
    };
}
