/**
 * @import { Plugin } from '../../generate.js'
 */
import { customElementKeys } from '../../helpers.js';

/**
 * SORT-MEMBERS-PLUGIN
 *
 * Sorts members for all classes in the manifest
 */
/** @returns {Plugin} */
export function sortMembersPlugin() {
    return {
        name: 'CORE - SORT-MEMBERS',
        packageLinkPhase({ customElementsManifest }) {
            if (!customElementsManifest.modules) {
                return;
            }
            for (const module of customElementsManifest.modules) {
                module.declarations?.sort((a, b) => a.name?.localeCompare(b.name || '') || 0);
                module.exports?.sort((a, b) => a.name?.localeCompare(b.name || '') || 0);

                if (!module.declarations) {
                    continue;
                }
                for (const customElement of module.declarations) {
                    if (customElement.kind !== 'class') {
                        continue;
                    }

                    customElementKeys.forEach((type) => {
                        customElement[/** @type {'members'} */ (type)]?.sort(
                            (a, b) => a.name?.localeCompare(b.name || '') || 0
                        );
                    });
                }
            }
        },
    };
}
