/** @import { Plugin } from '../../generate.js' */

/**
 * FIELD-DENY-LIST
 *
 * Excludes fields from the manifest
 */
/** @returns {Plugin} */
export function fieldDenyListPlugin() {
    const FIELD_DENY_LIST = ['observedAttributes'];

    return {
        name: 'CORE - FIELD-DENYLIST',
        moduleLinkPhase({ moduleDoc }) {
            const classes = moduleDoc?.declarations?.filter((declaration) => declaration.kind === 'class');

            classes?.forEach((klass) => {
                klass.members = klass?.members?.filter((member) => !FIELD_DENY_LIST.includes(member.name));
            });
        },
    };
}
