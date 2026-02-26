/**
 * @import { Plugin } from '../../generate.js'
 */
import { customElementKeys } from '../../helpers.js';

/**
 * CLEANUP-CLASSES
 *
 * Removes empty arrays from classes; e.g. if a class doesn't have any `members`,
 * then we remove it from the class doc
 */
/** @returns {Plugin} */
export function cleanupClassesPlugin() {
    return {
        name: 'CORE - CLEANUP-CLASSES',
        moduleLinkPhase({ moduleDoc }) {
            const classes = moduleDoc?.declarations?.filter((declaration) => declaration.kind === 'class') ?? [];

            classes.forEach((klass) => {
                customElementKeys.forEach((field) => {
                    const arr = klass[/** @type {'members'} */ (field)];
                    if (Array.isArray(arr) && arr.length === 0) {
                        delete klass[/** @type {'members'} */ (field)];
                    }
                });
            });
        },
    };
}
