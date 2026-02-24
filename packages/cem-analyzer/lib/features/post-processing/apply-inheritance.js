/**
 * @import { ClassDeclaration, Module } from 'custom-elements-manifest'
 * @import { Context, Plugin } from '../../generate.js'
 */

/**
 * @param {Context} context
 * @param {ClassDeclaration} klass
 * @returns {ClassDeclaration[]}
 */
function getInheritanceTree(context, klass) {
    /** @type {ClassDeclaration[]} */
    const tree = [];

    /** @type {ClassDeclaration | null} */
    let superClass = klass;
    /** @type {Module | null} */
    let superModule = context.getDeclarationModule(superClass);
    while (superClass?.superclass?.name && superModule) {
        superClass = context.resolveDeclaration(
            superClass.superclass.name,
            'class',
            superClass.superclass.module || superClass.superclass.package || superModule
        );
        if (!superClass) {
            break;
        }
        superModule = context.getDeclarationModule(superClass);
        tree.push(superClass);
    }
    return tree;
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
        packageLinkPhase({ customElementsManifest }) {
            if (!customElementsManifest.modules) {
                return;
            }
            for (const module of customElementsManifest.modules) {
                if (!module.declarations) {
                    continue;
                }
                for (const customElement of module.declarations) {
                    if (customElement.kind !== 'class') {
                        continue;
                    }
                    const tree = getInheritanceTree(this, customElement);
                    tree.forEach((klass) => {
                        [
                            'slots',
                            'cssParts',
                            'cssProperties',
                            'attributes',
                            'members',
                            'events',
                            'cssStates',
                            'icones',
                            'locale',
                        ].forEach((type) => {
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
                        });
                    });
                }
            }
        },
    };
}
