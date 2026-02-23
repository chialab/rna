/**
 * @import { CustomElementDeclaration } from 'custom-elements-manifest'
 * @import { Plugin } from '../../generate.js'
 */

/**
 * ISCUSTOMELEMENT
 *
 * Heuristic to see whether or not a class is a custom element
 */
/** @returns {Plugin} */
export function isCustomElementPlugin() {
    return {
        name: 'CORE - IS-CUSTOM-ELEMENT',
        packageLinkPhase({ customElementsManifest }) {
            customElementsManifest.modules?.forEach((_module) => {
                _module.declarations?.forEach((declaration) => {
                    if (declaration.kind === 'class') {
                        /** If a class has a tagName, that means its been defined, and is a custom element */
                        const customElementDeclaration = /** @type {CustomElementDeclaration} */ (declaration);
                        if (customElementDeclaration?.tagName) {
                            customElementDeclaration.customElement = true;
                        }
                    }
                });
            });
        },
    };
}
