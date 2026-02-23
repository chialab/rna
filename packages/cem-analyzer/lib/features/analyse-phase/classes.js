/** @import { Plugin } from '../../generate.js' */
import { createClass } from '../../creators/create-class.js';

/**
 * classPlugin
 *
 * handles classes
 */
/** @returns {Plugin} */
export function classPlugin() {
    return {
        name: 'CORE - CLASSES',
        analyzePhase({ node, moduleDoc }) {
            switch (node.type) {
                case 'ClassDeclaration': {
                    if (node.id?.type !== 'Identifier') {
                        return;
                    }

                    const classDeclaration = createClass(this, node);
                    moduleDoc.declarations ??= [];
                    moduleDoc.declarations.push(classDeclaration);
                    break;
                }
            }
        },
    };
}
