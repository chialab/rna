/** @import { Plugin } from '../../generate.js' */

/** @returns {Plugin} */
export function methodDenyListPlugin() {
    const METHOD_DENY_LIST = [
        'requestUpdate',
        'createRenderRoot',
        'scheduleUpdate',
        'performUpdate',
        'shouldUpdate',
        'update',
        'render',
        'firstUpdated',
        'updated',
        'willUpdate',
    ];

    return {
        name: 'LIT-METHOD-DENYLIST',
        moduleLinkPhase({ moduleDoc }) {
            const classesAndMixins =
                moduleDoc.declarations?.filter(
                    (declaration) => declaration.kind === 'class' || declaration.kind === 'mixin'
                ) ?? [];

            classesAndMixins.forEach((klass) => {
                if (!klass.members) {
                    return;
                }
                klass.members = klass.members?.filter((member) => !METHOD_DENY_LIST.includes(member.name));
            });
        },
    };
}
