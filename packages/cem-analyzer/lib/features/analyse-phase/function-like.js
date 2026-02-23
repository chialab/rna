/** @import { Plugin } from '../../generate.js' */
import { createFunction } from '../../creators/create-function.js';

/**
 * functionLikePlugin
 *
 * handles functionLikes such as class methods and functions
 * does NOT handle arrow functions
 */
/** @returns {Plugin} */
export function functionLikePlugin() {
    return {
        name: 'CORE - FUNCTION-LIKE',
        analyzePhase({ node, moduleDoc }) {
            switch (node.type) {
                case 'FunctionDeclaration': {
                    if (node.id?.type !== 'Identifier') {
                        return;
                    }
                    const functionLike = createFunction(this, node);
                    moduleDoc.declarations ??= [];
                    moduleDoc.declarations.push(functionLike);
                    break;
                }
            }
        },
    };
}
