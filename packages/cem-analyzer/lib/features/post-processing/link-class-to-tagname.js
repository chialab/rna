/**
 * @import { CustomElement, CustomElementExport } from 'custom-elements-manifest'
 * @import { Plugin } from '../../generate.js'
 */

/**
 * LINK-CLASS-TO-TAGNAME
 *
 * Links a custom element definition to its corresponding class
 */
/** @returns {Plugin} */
export function linkClassToTagnamePlugin() {
    return {
        name: 'CORE - LINK-CLASS-TO-TAGNAME',
        packageLinkPhase({ customElementsManifest }) {
            /* Get all class declarations and custom element definitions in the manifest */
            const classes = /** @type {CustomElement[]} */ (
                customElementsManifest.modules.flatMap(
                    (module) => module.declarations?.filter((declaration) => declaration.kind === 'class') || []
                )
            );
            const definitions = /** @type {CustomElementExport[]} */ (
                customElementsManifest.modules.flatMap(
                    (module) => module.exports?.filter((exp) => exp.kind === 'custom-element-definition') || []
                )
            );

            /* Loop through all classes, and try to find their corresponding custom element definition */
            classes.forEach((klass) => {
                const tagName = definitions?.find((def) => def?.declaration?.name === klass?.name)?.name;

                /* If there's a match, we can link the custom element definition to the class */
                if (tagName && !klass.tagName) {
                    klass.tagName = tagName;
                }
            });
        },
    };
}
