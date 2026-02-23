/**
 * @import { BooleanLiteral, Function as IFunction, ObjectProperty, StringLiteral } from '@oxc-project/types'
 * @import { Attribute, CustomElementDeclaration, CustomElementField } from 'custom-elements-manifest'
 * @import { Plugin } from '../../generate.js'
 */
import { decorateClassFieldWithJSDoc } from '../../utils.js';

/** @returns {Plugin} */
export function staticPropertiesPlugin() {
    return {
        name: 'DNA-STATIC-PROPERTIES',
        analyzePhase({ node, moduleDoc }) {
            if (node.type !== 'ClassDeclaration') {
                return;
            }

            const className = node.id?.name;
            const currClass = /** @type {CustomElementDeclaration | undefined} */ (
                moduleDoc.declarations?.find((declaration) => declaration.name === className)
            );

            if (!currClass) {
                return;
            }

            node.body.body?.forEach((member) => {
                if (
                    (member.type !== 'PropertyDefinition' &&
                        !(member.type === 'MethodDefinition' && member.kind === 'get')) ||
                    !member.static ||
                    member.key.type !== 'Identifier' ||
                    member.key.name !== 'properties'
                ) {
                    return;
                }

                const propertiesObject =
                    member.type === 'PropertyDefinition'
                        ? member.value?.type === 'ObjectExpression'
                            ? member.value
                            : undefined
                        : /** @type {IFunction} */ (member.value).body?.body?.find((n) => n.type === 'ReturnStatement')
                                ?.argument?.type === 'ObjectExpression'
                          ? /** @type {IFunction} */ (member.value).body?.body?.find(
                                (n) => n.type === 'ReturnStatement'
                            )?.argument
                          : undefined;

                if (propertiesObject?.type !== 'ObjectExpression') {
                    return;
                }

                propertiesObject?.properties?.forEach((property) => {
                    if (property.type !== 'Property' || property.value.type !== 'ObjectExpression') {
                        return;
                    }

                    const memberName = property.key.type === 'Identifier' ? property.key.name : '';
                    const existingMember = /** @type {CustomElementField | undefined} */ (
                        currClass.members?.find((field) => field.name === memberName)
                    );

                    /** @type {CustomElementField} */
                    const classMember = {
                        kind: 'field',
                        name: memberName,
                        description: existingMember?.description || undefined,
                        type: existingMember?.type || undefined,
                        privacy: 'public',
                        static: existingMember?.static || undefined,
                        reflects: existingMember?.reflects || undefined,
                        readonly: existingMember?.readonly || undefined,
                        deprecated: existingMember?.deprecated || undefined,
                        attribute: existingMember?.attribute || undefined,
                        default: existingMember?.default || undefined,
                    };
                    const propertyOptions = property.value.properties;
                    const typeOption = /** @type {ObjectProperty | undefined} */ (
                        propertyOptions.find(
                            (opt) => opt.type === 'Property' && opt.key.type === 'Identifier' && opt.key.name === 'type'
                        )
                    );

                    if (typeOption) {
                        switch (typeOption.value.type) {
                            case 'Identifier': {
                                switch (typeOption.value.name) {
                                    case 'String':
                                        classMember.type = { text: 'string' };
                                        break;
                                    case 'Number':
                                        classMember.type = { text: 'number' };
                                        break;
                                    case 'Boolean':
                                        classMember.type = { text: 'boolean' };
                                        break;
                                    default:
                                        classMember.type = {
                                            text: typeOption.value.name,
                                        };
                                }
                                break;
                            }
                            default:
                                classMember.type = {
                                    text: this.print(typeOption.value),
                                };
                        }
                    }

                    const jsdoc = this.parseJSDoc(property);
                    decorateClassFieldWithJSDoc(classMember, jsdoc);

                    const propertyAttr = /** @type {ObjectProperty | undefined} */ (
                        propertyOptions.find(
                            (prop) =>
                                prop.type === 'Property' &&
                                prop.key.type === 'Identifier' &&
                                prop.key.name === 'attribute' &&
                                prop.value.type === 'Literal'
                        )
                    );
                    if (
                        !propertyAttr ||
                        /** @type {StringLiteral | BooleanLiteral | undefined} */ (propertyAttr?.value)?.value !== false
                    ) {
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

                        const existingAttribute = currClass.attributes?.find((attr) => attr.name === attribute.name);

                        if (!existingAttribute) {
                            currClass.attributes ??= [];
                            currClass.attributes.push(attribute);
                        } else {
                            Object.assign(existingAttribute, attribute);
                        }
                    }

                    if (existingMember) {
                        Object.assign(existingMember, classMember);
                    } else {
                        currClass.members ??= [];
                        currClass.members.push(classMember);
                    }
                });
            });
        },
    };
}
