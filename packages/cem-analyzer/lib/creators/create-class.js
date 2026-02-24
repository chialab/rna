/**
 * @import { Class, MethodDefinition, PropertyDefinition } from '@oxc-project/types'
 * @import { Block } from 'comment-parser'
 * @import {
 *   Attribute,
 *   ClassDeclaration,
 *   ClassField,
 *   ClassMethod,
 *   CssCustomProperty,
 *   CssPart,
 *   CustomElement,
 *   CustomElementField,
 *   Event,
 * } from 'custom-elements-manifest'
 * @import { Context } from '../generate'
 */
import { decorateClassFieldWithJSDoc, decorateWithJSDoc, hasIgnoreJSDoc, print } from '../utils.js';
import { createFunction } from './create-function.js';

/**
 * @param {Context} context
 * @param {Class} node
 * @param {Block[]} [jsdoc=context.parseJSDoc(node)]
 * @returns {ClassDeclaration}
 */
export function createClass(context, node, jsdoc = context.parseJSDoc(node)) {
    /** @type {ClassDeclaration & Partial<CustomElement>} */
    const classTemplate = {
        kind: 'class',
        name: node.id?.type === 'Identifier' ? node.id.name : '',
        description: '',
        members: [],
        cssProperties: [],
        cssParts: [],
        slots: [],
        events: [],
        attributes: [],
        cssStates: [],
        superclass: undefined,
        tagName: undefined,
        customElement: undefined,
    };

    // collect attributes
    node.body.body.forEach((member) => {
        if (member.type === 'MethodDefinition' || member.type === 'PropertyDefinition') {
            if (member.static && member.key.type === 'Identifier' && member.key.name === 'observedAttributes') {
                if (member.type === 'PropertyDefinition' && member.value?.type === 'ArrayExpression') {
                    member.value.elements.forEach((el) => {
                        if (el?.type !== 'Literal' || typeof el.value !== 'string') {
                            return;
                        }
                        /** @type {Attribute} */
                        const attr = {
                            name: el.value,
                        };
                        classTemplate.attributes ??= [];
                        classTemplate.attributes.push(attr);
                    });
                }
                if (
                    member.type === 'MethodDefinition' &&
                    member.kind === 'get' &&
                    member.value?.type === 'FunctionExpression'
                ) {
                    const returnStatement = member.value.body?.body.find(
                        (statement) => statement.type === 'ReturnStatement'
                    );
                    if (!returnStatement || returnStatement.argument?.type !== 'ArrayExpression') {
                        return;
                    }
                    returnStatement.argument.elements.forEach((el) => {
                        if (el?.type !== 'Literal' || typeof el.value !== 'string') {
                            return;
                        }
                        /** @type {Attribute} */
                        const attr = {
                            name: el.value,
                        };
                        classTemplate.attributes ??= [];
                        classTemplate.attributes.push(attr);
                    });
                }
            }
            return;
        }
    });

    // collect members
    node.body.body.forEach((member) => {
        const jsdoc = context.parseJSDoc(member);
        if (hasIgnoreJSDoc(jsdoc)) {
            return;
        }

        if (
            (member.type === 'AccessorProperty' ||
                member.type === 'PropertyDefinition' ||
                member.type === 'TSAbstractAccessorProperty' ||
                member.type === 'TSAbstractPropertyDefinition' ||
                (member.type === 'MethodDefinition' && member.kind === 'get')) &&
            member.key.type === 'Identifier'
        ) {
            /** @type {ClassField | CustomElementField} */
            const fieldTemplate = {
                kind: 'field',
                name: member.key.name,
                description: undefined,
                type: undefined,
                static: member.static || undefined,
                privacy: member.accessibility || undefined,
                reflects: undefined,
                readonly: undefined,
                deprecated: undefined,
                attribute: undefined,
                default: undefined,
            };

            const propertyMember = /** @type {PropertyDefinition} */ (member);
            /** @type {PropertyDefinition["typeAnnotation"] | undefined} */
            const type = propertyMember.typeAnnotation;
            let typeText;
            if (type) {
                typeText = context.print(type.typeAnnotation);
            }
            if (propertyMember.readonly) {
                fieldTemplate.readonly = true;
            }
            if (
                /** @type {MethodDefinition} */ (member).kind === 'get' &&
                !node.body.body.find(
                    (m) =>
                        m.type === 'MethodDefinition' &&
                        m.kind === 'set' &&
                        m.key.type === 'Identifier' &&
                        m.key.name === fieldTemplate.name
                )
            ) {
                fieldTemplate.readonly = true;
                const returnType = /** @type {MethodDefinition} */ (member).value.returnType;
                if (returnType && !typeText) {
                    typeText = context.print(returnType.typeAnnotation);
                }
                const returnStatement = /** @type {MethodDefinition} */ (member).value.body?.body.find(
                    (statement) => statement.type === 'ReturnStatement'
                );
                if (returnStatement?.argument?.type === 'Literal') {
                    const value = returnStatement.argument.value;
                    if (!typeText) {
                        if (typeof value === 'string') {
                            typeText = 'string';
                        } else if (typeof value === 'number') {
                            typeText = 'number';
                        } else if (typeof value === 'boolean') {
                            typeText = 'boolean';
                        } else if (typeof value === 'symbol') {
                            typeText = 'symbol';
                        } else if (typeof value === 'bigint') {
                            typeText = 'bigint';
                        }
                    }
                    fieldTemplate.default = returnStatement.argument.raw || String(value);
                }
            }

            decorateClassFieldWithJSDoc(fieldTemplate, jsdoc);

            if (member.value && member.type !== 'MethodDefinition') {
                fieldTemplate.default = (member.value.type === 'Literal' && member.value.raw) || print(member.value);
                if (!fieldTemplate.type) {
                    if (member.value.type === 'Literal') {
                        const value = member.value.value;
                        if (typeof value === 'string') {
                            typeText = 'string';
                        } else if (typeof value === 'number') {
                            typeText = 'number';
                        } else if (typeof value === 'boolean') {
                            typeText = 'boolean';
                        } else if (typeof value === 'symbol') {
                            typeText = 'symbol';
                        } else if (typeof value === 'bigint') {
                            typeText = 'bigint';
                        }
                    } else if (member.value.type === 'ArrayExpression') {
                        typeText = 'array';
                    } else if (member.value.type === 'ObjectExpression') {
                        typeText = 'object';
                    }
                }
            }

            if (typeText) {
                if (member.optional) {
                    typeText += ' | undefined';
                }
                fieldTemplate.type = {
                    text: typeText,
                };
            }

            const attrTag = jsdoc.flatMap((comment) =>
                comment.tags.filter((tag) => ['attr', 'attribute'].includes(tag.tag))
            )[0];
            if (attrTag) {
                const attribute = attrTag.name || fieldTemplate.name;
                /** @type {CustomElementField} */ (fieldTemplate).attribute = attribute;

                const attrAlreadyExists = classTemplate.attributes?.find((attr) => attr.name === attribute);
                if (attrAlreadyExists) {
                    classTemplate.attributes = classTemplate.attributes?.map((attr) =>
                        attr.name === attribute
                            ? {
                                  ...attrAlreadyExists,
                                  description: attrTag?.description || fieldTemplate.description || undefined,
                                  type: fieldTemplate.type,
                                  fieldName: fieldTemplate.name,
                                  default: fieldTemplate.default,
                              }
                            : attr
                    );
                } else {
                    classTemplate.attributes ??= [];
                    classTemplate.attributes.push({
                        name: attribute,
                        description: attrTag?.description || fieldTemplate.description || undefined,
                        type: fieldTemplate.type,
                        fieldName: fieldTemplate.name,
                        default: fieldTemplate.default,
                    });
                }
            }
            classTemplate.members ??= [];
            classTemplate.members.push(fieldTemplate);
            return;
        }
        if (
            (member.type === 'MethodDefinition' || member.type === 'TSAbstractMethodDefinition') &&
            member.kind === 'method' &&
            member.key.type === 'Identifier'
        ) {
            /** @type {ClassMethod} */
            const classMethod = {
                ...createFunction(context, member.value, jsdoc),
                name: member.key.name,
                kind: 'method',
                privacy: member.accessibility || undefined,
            };
            decorateClassFieldWithJSDoc(classMethod, jsdoc);
            classTemplate.members ??= [];
            classTemplate.members.push(classMethod);
        }
    });

    if (node.superClass?.type === 'Identifier') {
        classTemplate.superclass = {
            name: node.superClass.name,
            ...context.resolveModuleOrPackageSpecifier(node.superClass.name),
        };
    }

    decorateWithJSDoc(classTemplate, jsdoc);

    jsdoc.forEach((comment) => {
        comment.tags.forEach((tag) => {
            if (['attr', 'attribute'].includes(tag.tag) && tag.name) {
                const existingAttribute = classTemplate.attributes?.find((attr) => attr.name === tag.name);
                /** @type {Attribute} */
                const attributeTemplate = {
                    name: tag.name,
                    description: existingAttribute?.description || tag.description || undefined,
                    type:
                        existingAttribute?.type || tag.type
                            ? {
                                  text: tag.type,
                              }
                            : undefined,
                };
                if (existingAttribute) {
                    Object.assign(existingAttribute, attributeTemplate);
                } else {
                    classTemplate.attributes ??= [];
                    classTemplate.attributes?.push(attributeTemplate);
                }
            }
            if (['prop', 'property'].includes(tag.tag) && tag.name) {
                const existingProperty = /** @type {CustomElementField | undefined} */ (
                    classTemplate.members?.find((member) => member.name === tag.name)
                );
                /** @type {ClassField | CustomElementField} */
                const propertyTemplate = {
                    kind: 'field',
                    name: tag.name,
                    description: existingProperty?.description || tag.description || undefined,
                    type:
                        existingProperty?.type || tag.type
                            ? {
                                  text: tag.type,
                              }
                            : undefined,
                    static: existingProperty?.static || undefined,
                    privacy: existingProperty?.privacy || undefined,
                    reflects: existingProperty?.reflects || undefined,
                    readonly: existingProperty?.readonly || undefined,
                    deprecated: existingProperty?.deprecated || undefined,
                    attribute: existingProperty?.attribute || undefined,
                    default: existingProperty?.default || undefined,
                };
                if (existingProperty) {
                    Object.assign(existingProperty, propertyTemplate);
                } else {
                    classTemplate.members ??= [];
                    classTemplate.members?.push(propertyTemplate);
                }
            }
            if (['event', 'fires'].includes(tag.tag) && tag.name) {
                const existingEvent = classTemplate.events?.find((event) => event.name === tag.name);
                /** @type {Event} */
                const eventTemplate = {
                    name: tag.name,
                    description: existingEvent?.description || tag.description || undefined,
                    type:
                        existingEvent?.type ||
                        /** @type {any} */ (
                            tag.type
                                ? {
                                      text: tag.type,
                                  }
                                : undefined
                        ),
                };
                if (existingEvent) {
                    Object.assign(existingEvent, eventTemplate);
                } else {
                    classTemplate.events ??= [];
                    classTemplate.events?.push(eventTemplate);
                }
            }
            if (['csspart', 'part'].includes(tag.tag) && tag.name) {
                const existingPart = classTemplate.cssParts?.find((part) => part.name === tag.name);
                /** @type {CssPart} */
                const partTemplate = {
                    name: tag.name,
                    description: existingPart?.description || tag.description || undefined,
                };
                if (existingPart) {
                    Object.assign(existingPart, partTemplate);
                } else {
                    classTemplate.cssParts ??= [];
                    classTemplate.cssParts?.push(partTemplate);
                }
            }
            if (['cssprop', 'cssproperty'].includes(tag.tag) && tag.name) {
                const existingCssProp = classTemplate.cssProperties?.find((cssProp) => cssProp.name === tag.name);
                /** @type {CssCustomProperty} */
                const cssPropTemplate = {
                    name: tag.name,
                    description: existingCssProp?.description || tag.description || undefined,
                    default: existingCssProp?.default || tag.default || undefined,
                };
                if (existingCssProp) {
                    Object.assign(existingCssProp, cssPropTemplate);
                } else {
                    classTemplate.cssProperties ??= [];
                    classTemplate.cssProperties?.push(cssPropTemplate);
                }
            }
            if (['slot'].includes(tag.tag)) {
                const name = tag.name.replace('-', '');
                const existingSlot = classTemplate.slots?.find((slot) => (slot.name || '') === name);
                /** @type {{ name: string; description?: string }} */
                const slotTemplate = {
                    name,
                    description: existingSlot?.description || tag.description || undefined,
                };
                if (existingSlot) {
                    Object.assign(existingSlot, slotTemplate);
                } else {
                    classTemplate.slots ??= [];
                    classTemplate.slots?.push(slotTemplate);
                }
            }
            if (['tag', 'tagname', 'element', 'customelement'].includes(tag.tag.toLowerCase()) && tag.name) {
                classTemplate.tagName = tag.name;
                classTemplate.customElement = true;
            }
        });
    });

    context.walk(node.body, (child) => {
        if (child.type !== 'CallExpression') {
            return;
        }

        const callee = child.callee;
        if (
            callee.type !== 'MemberExpression' ||
            callee.object.type !== 'ThisExpression' ||
            callee.property.type !== 'Identifier' ||
            callee.property.name !== 'dispatchEvent'
        ) {
            return;
        }

        const arg = child.arguments[0];
        if (!arg || arg.type !== 'NewExpression') {
            return;
        }

        const className = arg.callee.type === 'Identifier' ? arg.callee.name : null;
        if (!className) {
            return;
        }

        const eventName =
            arg.arguments[0]?.type === 'Literal' && typeof arg.arguments[0].value === 'string'
                ? arg.arguments[0].value
                : null;
        if (!eventName) {
            return;
        }

        const jsdoc = context.parseJSDoc(child);
        if (hasIgnoreJSDoc(jsdoc)) {
            return;
        }

        const existingEvent = classTemplate.events?.find((event) => event.name === eventName);
        /** @type {Event} */
        const eventTemplate = {
            name: eventName,
            type: {
                text: className,
            },
        };
        if (existingEvent) {
            Object.assign(existingEvent, eventTemplate);
        } else {
            classTemplate.events ??= [];
            classTemplate.events.push(eventTemplate);
        }
    });

    return classTemplate;
}
