/** @import { Plugin } from '../../generate.js' */

/** @returns {Plugin} */
export function methodDenyListPlugin() {
    const METHOD_DENY_LIST = [
        'initialize',
        'assign',
        'forceUpdate',
        'connectedCallback',
        'disconnectedCallback',
        'attributeChangedCallback',
        'stateChangedCallback',
        'propertyChangedCallback',
        'updatedCallback',
        'childListChangedCallback',
        'requestUpdate',
        'shouldUpdate',
        'observe',
        'unobserve',
        'render',
        'collectUpdatesStart',
        'collectUpdatesEnd',
        'dispatchEvent',
        'dispatchAsyncEvent',
        'delegateEventListener',
        'undelegateEventListener',
    ];

    return {
        name: 'DNA-METHOD-DENYLIST',
        moduleLinkPhase({ moduleDoc }) {
            const classesAndMixins =
                moduleDoc.declarations?.filter(
                    (declaration) => declaration.kind === 'class' || declaration.kind === 'mixin'
                ) ?? [];

            classesAndMixins.forEach((klass) => {
                if (!klass.members) {
                    return;
                }
                klass.members = klass.members
                    ?.filter((member) => member.static || !METHOD_DENY_LIST.includes(member.name))
                    .filter((member) => member.privacy !== 'private' && member.privacy !== 'protected');
            });
        },
    };
}
