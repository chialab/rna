/** @import { Plugin } from '../../generate.js' */
import { createFunction } from '../../creators/create-function.js';

/**
 * arrowFunctionPlugin
 *
 * handles arrow functions
 */
/** @returns {Plugin} */
export function arrowFunctionPlugin() {
    return {
        name: 'CORE - ARROW-FUNCTION',
        analyzePhase({ node, moduleDoc }) {
            switch (node.type) {
                case 'VariableDeclaration': {
                    node.declarations.forEach((declarator) => {
                        if (
                            declarator.id.type === 'Identifier' &&
                            declarator.init?.type === 'ArrowFunctionExpression'
                        ) {
                            const functionDeclaration = {
                                ...createFunction(this, declarator.init, this.parseJSDoc(declarator)),
                                name: declarator.id.name,
                            };
                            moduleDoc.declarations ??= [];
                            moduleDoc.declarations.push(functionDeclaration);
                        }
                    });
                    break;
                }
            }
        },
    };
}
