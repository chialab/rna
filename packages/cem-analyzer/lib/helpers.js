/**
 * @import { ClassDeclaration, Package } from 'custom-elements-manifest'
 */

export const customElementKeys = [
    'slots',
    'cssParts',
    'cssProperties',
    'attributes',
    'members',
    'events',
    'cssStates',
    'icones',
    'locale',
];

/**
 * Apply inheritance for all classes in the manifest, merging properties and members from superclasses into subclasses, and marking inherited items with their source class and module.
 * @param {Package} manifest - The custom elements manifest to apply inheritance to.
 * @return {void}
 */
export function applyInheritance(manifest) {
    // apply inheritance for all classes in the manifest
    for (const module of manifest.modules) {
        if (!module.declarations) {
            continue;
        }
        for (const declaration of module.declarations) {
            if (declaration.kind === 'class') {
                /**
                 * @type {ClassDeclaration | null}
                 */
                let klass = declaration;
                while (klass?.superclass?.name) {
                    const specifier = klass.superclass.module || klass.superclass.package || module.path;
                    klass = findDeclaration(manifest, klass.superclass.name, specifier);
                    if (klass) {
                        customElementKeys.forEach((type) => {
                            const items = klass?.[/** @type {'members'} */ (type)] || [];
                            if (!items.length) {
                                return;
                            }
                            const arr = declaration[/** @type {'members'} */ (type)] || [];
                            items.forEach((item) => {
                                const existing = arr.find((i) => i.name === item.name);
                                if (existing) {
                                    for (const key in item) {
                                        if (
                                            item[/** @type {'name'} */ (key)] &&
                                            !existing[/** @type {'name'} */ (key)]
                                        ) {
                                            existing[/** @type {'name'} */ (key)] = item[/** @type {'name'} */ (key)];
                                        }
                                    }
                                } else {
                                    arr.push({
                                        ...item,
                                        inheritedFrom: {
                                            name: klass?.name || '',
                                            module: specifier,
                                        },
                                    });
                                }
                            });
                            arr.sort((a, b) => a.name?.localeCompare(b.name || '') || 0);
                            declaration[/** @type {'members'} */ (type)] = arr;
                        });
                    }
                }
            }
        }
    }
}

/**
 * Find a declaration in the custom elements manifest by its name and kind, returning null if the declaration is not found or if the manifest is invalid.
 * @param {Package} manifest
 * @param {string} declarationName
 * @param {string} modulePath
 * @returns {ClassDeclaration | null}
 */
export function findDeclaration(manifest, declarationName, modulePath) {
    const module = manifest.modules?.find((m) => m.path === modulePath);
    if (!module?.exports) {
        return null;
    }

    for (const exp of module.exports) {
        if (exp.name === declarationName) {
            const specifier = exp.declaration.module || exp.declaration.package;
            if (specifier) {
                return findDeclaration(manifest, exp.declaration.name || declarationName, specifier);
            }

            if (!module.declarations) {
                return null;
            }

            const declaration = module.declarations.find((d) => d.name === declarationName && d.kind === 'class');
            if (declaration) {
                return /** @type {ClassDeclaration} */ (declaration);
            }

            return null;
        }
        if (exp.name === '*') {
            const specifier = exp.declaration.module || exp.declaration.package;
            if (!specifier) {
                continue;
            }
            const found = findDeclaration(manifest, declarationName, specifier);
            if (found) {
                return found;
            }
        }
    }

    return null;
}

/**
 * Merges two custom elements manifests by combining their properties and modules, returning a new manifest that includes all unique modules from both input manifests.
 * @param {Package} manifest1
 * @param {Package} manifest2
 * @returns {Package}
 */
export function mergeCustomElementsManifests(manifest1, manifest2) {
    /**
     * @param {Package} manifest1
     * @param {Package} manifest2
     */
    const manifest = {
        ...manifest1,
        ...manifest2,
        modules: [
            ...(manifest1.modules || []).filter((m) => !manifest2.modules?.some((mod) => mod.path === m.path)),
            ...(manifest2.modules || []),
        ],
    };

    applyInheritance(manifest);

    return manifest;
}
