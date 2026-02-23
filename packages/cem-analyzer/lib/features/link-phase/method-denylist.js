/** @import { Plugin } from '../../generate.js' */

/**
 * METHOD-DENY-LIST
 *
 * Excludes methods from the manifest
 */
/** @returns {Plugin} */
export function methodDenyListPlugin() {
    const METHOD_DENY_LIST = [
        'connectedCallback',
        'disconnectedCallback',
        'attributeChangedCallback',
        'adoptedCallback',
    ];

    return {
        name: 'CORE - METHOD-DENYLIST',
        moduleLinkPhase({ moduleDoc }) {
            const classes = moduleDoc?.declarations?.filter((declaration) => declaration.kind === 'class');

            classes?.forEach((klass) => {
                klass.members = klass?.members?.filter((member) => !METHOD_DENY_LIST.includes(member.name));
            });
        },
    };
}
