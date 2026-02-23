/** @import { Plugin } from '../../generate.js' */

/** @returns {Plugin} */
export function memberDenyListPlugin() {
    const STATIC_MEMBER_DENY_LIST = ['globalStyles', 'properties', 'listeners'];

    return {
        name: 'DNA-MEMBER-DENYLIST',
        moduleLinkPhase({ moduleDoc }) {
            const classes = moduleDoc.declarations?.filter((declaration) => declaration.kind === 'class') ?? [];

            classes.forEach((klass) => {
                if (!klass.members) {
                    return;
                }
                klass.members = klass.members
                    ?.filter((member) => !(member.static && STATIC_MEMBER_DENY_LIST.includes(member.name)))
                    .filter((member) => member.privacy !== 'private' && member.privacy !== 'protected');
            });
        },
    };
}
