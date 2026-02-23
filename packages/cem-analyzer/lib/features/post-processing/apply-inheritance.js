/**
 * @import { ClassDeclaration, CustomElement } from 'custom-elements-manifest'
 * @import { Context, Plugin } from '../../generate.js'
 */

/**
 * @param {Context} context
 * @param {string} className
 * @returns {ClassDeclaration[]}
 */
function getInheritanceTree(context, className) {
    /** @type {ClassDeclaration[]} */
    const tree = [];

    let klass = context.getDeclarationByName(className, 'class');
    if (klass) {
        tree.push(klass);

        while (klass?.superclass?.name) {
            klass = context.getDeclarationByName(klass.superclass.name, 'class');
            if (!klass) {
                break;
            }
            tree.push(klass);
        }
        return tree;
    }
    return [];
}

/**
 * APPLY-INHERITANCE-PLUGIN
 *
 * Applies inheritance for all classes in the manifest
 */
/** @returns {Plugin} */
export function applyInheritancePlugin() {
    return {
        name: 'CORE - APPLY-INHERITANCE',
        packageLinkPhase() {
            this.getDeclarations('class').forEach((customElement) => {
                getInheritanceTree(this, customElement.name).forEach((klass) => {
                    // ignore the current class itself
                    if (klass?.name === customElement.name) {
                        return;
                    }

                    ['slots', 'cssParts', 'cssProperties', 'attributes', 'members', 'events', 'cssStates'].forEach(
                        (type) => {
                            const items = klass[/** @type {'members'} */ (type)] || [];
                            if (!items.length) {
                                return;
                            }

                            const resolution = this.resolveModuleOrPackageSpecifier(klass);
                            const arr = customElement[/** @type {'members'} */ (type)] || [];
                            customElement[/** @type {'members'} */ (type)] = arr || [];
                            items.forEach((currItem) => {
                                const newItem = { ...currItem };

                                /**
                                 * If an attr or member is already present in the base class, but we encounter it here,
                                 * it means that the base has overridden that method from the super class
                                 * So we either add the data to the overridden method, or we add it to the array as a new item
                                 */
                                const existingIndex = arr.findIndex((item) => newItem.name === item.name);

                                if (existingIndex !== -1) {
                                    const existing = arr[existingIndex];
                                    existing.inheritedFrom = {
                                        name: klass.name,
                                        ...resolution,
                                    };

                                    arr[existingIndex] = {
                                        ...newItem,
                                        ...existing,
                                        ...{
                                            ...('type' in newItem ? { type: newItem.type } : {}),
                                            ...(newItem.privacy ? { privacy: newItem.privacy } : {}),
                                        },
                                    };
                                } else {
                                    newItem.inheritedFrom = {
                                        name: klass.name,
                                        ...resolution,
                                    };

                                    arr.push(newItem);
                                }
                            });
                        }
                    );
                });
            });
        },
    };
}
