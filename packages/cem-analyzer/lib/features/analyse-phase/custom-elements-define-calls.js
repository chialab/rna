/**
 * @import { CustomElementExport } from 'custom-elements-manifest'
 * @import { Plugin } from '../../generate.js'
 */
import { createClass } from '../../creators/create-class.js';
import { hasIgnoreJSDoc } from '../../utils.js';

/**
 * CUSTOM-ELEMENTS-DEFINE-CALLS
 *
 * Analyzes calls for:
 * @example customElements.define()
 * @example window.customElements.define()
 */
/** @returns {Plugin} */
export function customElementsDefineCallsPlugin() {
    let counter = 0;
    return {
        name: 'CORE - CUSTOM-ELEMENTS-DEFINE-CALLS',
        analyzePhase({ node, moduleDoc }) {
            if (node.type === 'Program') {
                counter = 0;
            }

            /**
             * @example customElements.define('my-el', MyEl);
             * @example window.customElements.define('my-el', MyEl);
             */
            if (
                node.type === 'CallExpression' &&
                node.callee.type === 'MemberExpression' &&
                ((node.callee.object.type === 'Identifier' && node.callee.object.name === 'customElements') ||
                    (node.callee.object.type === 'MemberExpression' &&
                        node.callee.object.object.type === 'Identifier' &&
                        node.callee.object.object.name === 'window' &&
                        node.callee.object.property.type === 'Identifier' &&
                        node.callee.object.property.name === 'customElements')) &&
                node.callee.property.type === 'Identifier' &&
                node.callee.property.name === 'define'
            ) {
                const jsdoc = this.parseJSDoc(node);
                if (hasIgnoreJSDoc(jsdoc)) {
                    return;
                }

                const classArg = node.arguments[1];
                if (!classArg) {
                    return;
                }

                const elementTag = node.arguments[0]?.type === 'Literal' ? String(node.arguments[0].value) : null;
                if (!elementTag) {
                    return;
                }

                let elementClass = null;

                /**
                 * @example customElements.define('m-e', class extends HTMLElement{})
                 *                                            ^
                 */
                const isAnonymousClass = classArg.type === 'ClassExpression';
                const isUnnamed = isAnonymousClass && !classArg.id;
                if (isAnonymousClass) {
                    const klass = createClass(this, classArg, []);
                    if (isUnnamed) {
                        elementClass = klass.name = `anonymous_${counter++}`;
                    }

                    moduleDoc.declarations ??= [];
                    moduleDoc.declarations.push(klass);
                }

                /**
                 * @example customElements.define('m-e', MyElement)
                 *                                       ^^^^^^^^^
                 */
                if (node.arguments[1]?.type === 'Identifier') {
                    elementClass = node.arguments[1].name;
                }

                /**
                 * @example customElements.define('m-e', class MyElement extends HTMLElement{})
                 *                                             ^^^^^^^^^
                 */
                if (classArg?.type === 'ClassExpression' && classArg.id?.type === 'Identifier') {
                    elementClass = classArg.id.name;
                }

                if (!elementClass) {
                    return;
                }

                const klass = classArg.type === 'Identifier' ? this.getNodeByName(elementClass) : classArg;

                if (!klass) {
                    return;
                }

                const classDoc = this.parseJSDoc(klass);
                if (hasIgnoreJSDoc(classDoc)) {
                    return;
                }

                /** @type {CustomElementExport} */
                const definitionDoc = {
                    kind: 'custom-element-definition',
                    name: elementTag,
                    declaration: {
                        name: elementClass,
                        ...this.resolveModuleOrPackageSpecifier(elementClass),
                    },
                };

                moduleDoc.exports ??= [];
                moduleDoc.exports.push(definitionDoc);
            }
        },
    };
}
