/**
 * @import { CallExpression, TSType } from '@oxc-project/types'
 * @import { CustomElementDeclaration, CustomElementField, Event } from 'custom-elements-manifest'
 * @import { Plugin } from '../../generate.js'
 */
import { decorateWithJSDoc } from '../../utils.js';

/** @returns {Plugin} */
export function firesDecoratorPlugin() {
    return {
        name: 'DNA-FIRES-DECORATOR',
        analyzePhase({ node, moduleDoc }) {
            if (node.type !== 'ClassDeclaration') {
                return;
            }
            const className = node.id?.name;
            const classDoc =
                /** @type {(CustomElementDeclaration & { icons?: { name: string; description: string }[]; }) | undefined} */ (
                    moduleDoc.declarations?.find((declaration) => declaration.name === className)
                );
            if (!classDoc) {
                return;
            }

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
                const firesDecorator = member.decorators?.find(
                    (dec) =>
                        dec.expression.type === 'CallExpression' &&
                        dec.expression.callee.type === 'Identifier' &&
                        dec.expression.callee.name === 'fires'
                );
                if (!firesDecorator) {
                    return;
                }

                const decoratorArguments = /** @type {CallExpression} */ (firesDecorator.expression).arguments;

                const eventName =
                    decoratorArguments.length && decoratorArguments[0].type === 'Literal'
                        ? String(decoratorArguments[0].value)
                        : memberName.replace(/^on/, '');
                if (!eventName) {
                    return;
                }

                /** @type {string | TSType} */
                let type = 'Event';
                if (
                    member.typeAnnotation?.type === 'TSTypeAnnotation' &&
                    member.typeAnnotation.typeAnnotation.type === 'TSTypeReference' &&
                    member.typeAnnotation.typeAnnotation.typeName.type === 'Identifier' &&
                    member.typeAnnotation.typeAnnotation.typeName.name === 'EventHandler' &&
                    member.typeAnnotation.typeAnnotation.typeArguments?.params?.length
                ) {
                    type = member.typeAnnotation.typeAnnotation.typeArguments.params[0];
                }

                /** @type {Event} */
                const eventTemplate = {
                    name: eventName,
                    description: undefined,
                    type: {
                        text: typeof type === 'string' ? type : this.print(type),
                    },
                };

                const jsdoc = this.parseJSDoc(member);
                decorateWithJSDoc(eventTemplate, jsdoc);

                classDoc.events ??= [];
                classDoc.events.push(eventTemplate);
            });
        },
    };
}
