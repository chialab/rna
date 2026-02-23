/**
 * @import { BooleanLiteral, CallExpression, ObjectProperty, StringLiteral } from '@oxc-project/types'
 * @import { Attribute, CustomElementDeclaration, CustomElementField } from 'custom-elements-manifest'
 * @import { Plugin } from '../../generate.js'
 */

/** @returns {Plugin} */
export function propertyDecoratorPlugin() {
    return {
        name: 'DNA-PROPERTY-DECORATOR',
        analyzePhase({ node, moduleDoc }) {
            if (node.type !== 'ClassDeclaration') {
                return;
            }

            const className = node.id?.name;
            const classDoc = /** @type {CustomElementDeclaration | undefined} */ (
                moduleDoc.declarations?.find((declaration) => declaration.name === className)
            );

            if (!classDoc) {
                return;
            }

            /**
             * Find members with @property decorator
             */
            node.body.body?.forEach((member) => {
                if (member.type !== 'PropertyDefinition' || member.static) {
                    return;
                }

                const memberName = member.key.type === 'Identifier' ? member.key.name : null;
                if (!memberName) {
                    return;
                }

                const classMember = /** @type {CustomElementField | undefined} */ (
                    classDoc.members?.find((classMember) => classMember.name === memberName)
                );
                if (classMember?.kind !== 'field') {
                    return;
                }
                const propertyDecorator = member.decorators?.find(
                    (dec) =>
                        dec.expression.type === 'CallExpression' &&
                        dec.expression.callee.type === 'Identifier' &&
                        dec.expression.callee.name === 'property'
                );
                const stateDecorator = member.decorators?.find(
                    (dec) =>
                        dec.expression.type === 'CallExpression' &&
                        dec.expression.callee.type === 'Identifier' &&
                        dec.expression.callee.name === 'state'
                );
                const actualDecorator = propertyDecorator || stateDecorator;
                if (!actualDecorator) {
                    if (classDoc.members) {
                        classDoc.members = classDoc.members.filter((m) => m !== classMember);
                    }
                    return;
                }

                if (stateDecorator) {
                    classMember.privacy = 'protected';
                }

                const propertyOptions = /** @type {CallExpression} */ (actualDecorator.expression).arguments?.find(
                    (arg) => arg.type === 'ObjectExpression'
                )?.properties;

                /**
                 * If property does _not_ have `attribute: false`, also create an attribute based on the field
                 */
                const propertyAttr = /** @type {ObjectProperty | undefined} */ (
                    propertyOptions?.find(
                        (prop) =>
                            prop.type === 'Property' &&
                            prop.key.type === 'Identifier' &&
                            prop.key.name === 'attribute' &&
                            prop.value.type === 'Literal'
                    )
                );
                if (/** @type {StringLiteral | BooleanLiteral | undefined} */ (propertyAttr?.value)?.value === false) {
                    return;
                }

                /** @type {Attribute} */
                const attribute = {
                    name: classMember.name,
                    description: classMember.description || undefined,
                    type: classMember.type,
                    default: classMember.default,
                    fieldName: classMember.name,
                };

                const attributeName =
                    propertyAttr?.value.type === 'Literal' && typeof propertyAttr.value.value === 'string'
                        ? propertyAttr.value.value
                        : classMember.name;

                /**
                 * If an attribute name is provided
                 * @example @property({attribute:'my-foo'})
                 */
                if (attributeName) {
                    attribute.name = attributeName;
                    classMember.attribute = attributeName;
                } else {
                    classMember.attribute = classMember.name;
                }
                classMember.reflects = true;

                const existingAttribute = classDoc.attributes?.find((attr) => attr.name === attribute.name);

                if (!existingAttribute) {
                    classDoc.attributes ??= [];
                    classDoc.attributes.push(attribute);
                } else {
                    Object.assign(existingAttribute, attribute);
                }
            });
        },
    };
}
