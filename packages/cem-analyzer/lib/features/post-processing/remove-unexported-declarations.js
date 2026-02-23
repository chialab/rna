/**
 * @import { Declaration } from 'custom-elements-manifest'
 * @import { Plugin } from '../../generate.js'
 */

/**
 * @param {string} str
 * @returns {string[]}
 */
const extractVars = (str) => {
    const match = str.match(/{([^}]*)}/);
    if (!match) return [];
    return match[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
};

/**
 * @param {Declaration} declaration
 * @returns {boolean}
 */
const hasDefault = (declaration) => 'default' in declaration && typeof declaration.default === 'string';

/**
 * REMOVE-UNEXPORTED-DECLARATIONS
 *
 * If a module has declarations that are _not_ exported, that means those declarations are considered 'private' to that module, and they shouldnt be present in the manifest, so we remove them.
 */
/** @returns {Plugin} */
export function removeUnexportedDeclarationsPlugin() {
    return {
        name: 'CORE - REMOVE-UNEXPORTED-DECLARATIONS',
        packageLinkPhase({ customElementsManifest }) {
            customElementsManifest?.modules?.forEach((mod) => {
                if (mod?.declarations) {
                    const referencedVars = new Set();
                    mod.declarations.forEach((declaration) => {
                        const declarationAny = /** @type {any} */ (declaration);
                        if (
                            hasDefault(declaration) &&
                            declarationAny.default?.trim().startsWith('{') &&
                            declarationAny.default?.trim().endsWith('}')
                        ) {
                            extractVars(declarationAny.default).forEach((v) => {
                                referencedVars.add(v);
                            });
                        }
                    });

                    mod.declarations = mod.declarations.filter((declaration) => {
                        if (referencedVars.has(declaration.name)) {
                            return true;
                        }
                        return mod.exports?.some(
                            (_export) =>
                                declaration.name === _export.name || declaration.name === _export.declaration?.name
                        );
                    });
                }
            });
        },
    };
}
