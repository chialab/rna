/**
 * @import { CallExpression } from '@oxc-project/types'
 * @import { CustomElementExport } from 'custom-elements-manifest'
 * @import { Plugin } from '../../generate.js'
 */

/** @returns {Plugin} */
export function customElementDecoratorPlugin() {
    return {
        name: 'DNA-CUSTOM-ELEMENT-DECORATOR',
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

            const options = /** @type {CallExpression} */ (customElementDecorator.expression).arguments?.[1];
            let extend;
            if (options?.type === 'ObjectExpression') {
                const properties = options.properties;
                if (properties) {
                    for (let i = 0; i < properties.length; i++) {
                        const property = properties[i];
                        if (property.type !== 'Property') {
                            continue;
                        }
                        if (property.key.type !== 'Identifier' || property.key.name !== 'extends') {
                            continue;
                        }
                        if (property.value.type !== 'Literal' || typeof property.value.value !== 'string') {
                            break;
                        }
                        extend = property.value.value;
                        break;
                    }
                }
            }

            const existingDefinition = /** @type {(CustomElementExport & { extend?: string }) | undefined} */ (
                moduleDoc.exports?.find(
                    (exp) => exp.kind === 'custom-element-definition' && exp.name === String(tagNameArg.value)
                )
            );
            if (existingDefinition) {
                existingDefinition.extend = extend;
            } else {
                const definitionDoc = /** @type {CustomElementExport} */ ({
                    kind: 'custom-element-definition',
                    name: String(tagNameArg.value),
                    extend,
                    declaration: {
                        name: className,
                        ...this.resolveModuleOrPackageSpecifier(className),
                    },
                });

                moduleDoc.exports ??= [];
                moduleDoc.exports.push(definitionDoc);
            }
        },
    };
}
