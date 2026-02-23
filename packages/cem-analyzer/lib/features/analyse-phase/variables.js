/**
 * @import { VariableDeclaration } from 'custom-elements-manifest'
 * @import { Plugin } from '../../generate.js'
 */
import { decorateWithJSDoc } from '../../utils.js';

/**
 * variablePlugin
 *
 * handles variables
 */
/** @returns {Plugin} */
export function variablePlugin() {
    return {
        name: 'CORE - VARIABLES',
        analyzePhase({ node, moduleDoc }) {
            switch (node.type) {
                case 'VariableDeclaration': {
                    const jsdoc = this.parseJSDoc(node);
                    node.declarations.forEach((declarator) => {
                        if (declarator.id?.type !== 'Identifier') {
                            return;
                        }
                        const name = declarator.id.name;
                        /**
                         * It can be the case that a variable is already present in the declarations,
                         * for example if the variable is also an arrow function. So we need to make sure
                         * the declaration doesnt already exist before adding it to a modules declarations
                         */
                        const alreadyExists = moduleDoc.declarations?.some(
                            (_declaration) => _declaration.name === name
                        );

                        if (!alreadyExists) {
                            /** @type {VariableDeclaration} */
                            const variable = {
                                kind: 'variable',
                                name,
                            };
                            if (declarator.init) {
                                let value = null;
                                if (declarator.init.type === 'TSAsExpression') {
                                    value = this.print(declarator.init.expression);
                                    if (
                                        declarator.init.typeAnnotation.type === 'TSTypeReference' &&
                                        declarator.init.typeAnnotation.typeName.type === 'Identifier' &&
                                        declarator.init.typeAnnotation.typeName.name === 'const'
                                    ) {
                                        variable.type = {
                                            text: value,
                                        };
                                    }
                                } else if (declarator.init.type === 'Literal') {
                                    value = this.print(declarator.init);
                                    if (declarator.init.value == null) {
                                        //
                                    } else if (typeof declarator.init.value === 'string') {
                                        variable.type = {
                                            text: 'string',
                                        };
                                    } else if (typeof declarator.init.value === 'number') {
                                        variable.type = {
                                            text: 'number',
                                        };
                                    } else if (typeof declarator.init.value === 'boolean') {
                                        variable.type = {
                                            text: 'boolean',
                                        };
                                    } else if (typeof declarator.init.value === 'symbol') {
                                        variable.type = {
                                            text: 'symbol',
                                        };
                                    } else if (typeof declarator.init.value === 'bigint') {
                                        variable.type = {
                                            text: 'bigint',
                                        };
                                    }
                                } else if (
                                    declarator.init.type === 'BinaryExpression' ||
                                    declarator.init.type === 'ConditionalExpression' ||
                                    declarator.init.type === 'LogicalExpression' ||
                                    declarator.init.type === 'CallExpression' ||
                                    declarator.init.type === 'ArrowFunctionExpression' ||
                                    declarator.init.type === 'FunctionExpression' ||
                                    declarator.init.type === 'AssignmentExpression'
                                ) {
                                    // Do not attempt to set default value
                                } else {
                                    value = this.print(declarator.init);
                                }
                                if (value != null) {
                                    variable.default = value;
                                }
                            }
                            decorateWithJSDoc(variable, jsdoc);
                            moduleDoc.declarations ??= [];
                            moduleDoc.declarations.push(variable);
                        }
                    });
                    break;
                }
            }
        },
    };
}
