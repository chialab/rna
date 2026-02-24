/// <reference types="./typings.d.ts" />

/**
 * @import { ClassDeclaration, CustomElement, Package, PropertyLike } from 'custom-elements-manifest'
 */
import { logger } from 'storybook/internal/client-logger';
import { dedent } from 'ts-dedent';

/**
 * Retrieves the custom elements manifest from the global window object, returning it if available or undefined if not set.
 * @returns {Package | undefined}
 */
export function getCustomElementsManifest() {
    return window.__STORYBOOK_CUSTOM_ELEMENTS_MANIFEST__;
}

/**
 * Sets the custom elements manifest on the global window object, allowing it to be accessed by other parts of the application. This function should be called with a valid custom elements manifest object to ensure that it can be retrieved correctly when needed.
 * @param {Package} manifest
 */
export function setCustomElementsManifest(manifest) {
    window.__STORYBOOK_CUSTOM_ELEMENTS_MANIFEST__ = manifest;
}

/**
 * Validates whether a given tag name is a non-empty string, which is necessary for it to be considered a valid custom element tag name. If the tag name is valid, the function returns true; otherwise, it returns false or throws an error if the provided value is not a string.
 * @param {string} tagName
 * @return {boolean}
 */
function isValidTagName(tagName) {
    if (!tagName) {
        return false;
    }
    if (typeof tagName === 'string') {
        return true;
    }
    throw new Error('Provided component needs to be a string. e.g. component: "my-element"');
}

/**
 * Validates whether the provided manifest is a valid custom elements manifest by checking if it has a 'modules' property that is an array. If the manifest is valid, the function returns true; otherwise, it returns false or throws an error if the manifest does not meet the expected structure.
 * @param {Package} manifest
 * @return {boolean}
 */
function isValidManifest(manifest) {
    if (!manifest) {
        return false;
    }

    if (manifest.modules && Array.isArray(manifest.modules)) {
        return true;
    }
    throw new Error(dedent`
        You need to setup valid meta data in your config.js via setCustomElements().
        See the readme of addon-docs for web components for more details.
    `);
}

/**
 * Retrieves the custom element declaration from the custom elements manifest for a given tag name, returning null if the tag name is invalid or not found in the manifest.
 * @param {string} tagName
 * @param {Package} manifest
 * @returns {CustomElement | null}
 */
export const getCustomElementDeclaration = (tagName, manifest) => {
    if (!isValidTagName(tagName) || !isValidManifest(manifest)) {
        return null;
    }

    if (!manifest || !manifest.modules) {
        return null;
    }

    /** @type {CustomElement | null} */
    let metadata = null;
    manifest.modules.forEach((_module) => {
        if (!_module || !_module.declarations) {
            return;
        }
        _module.declarations.forEach((declaration) => {
            if (/** @type {CustomElement} */ (declaration).tagName === tagName) {
                metadata = /** @type {CustomElement} */ (declaration);
            }
        });
    });

    if (!metadata) {
        logger.warn(`Component not found in custom-elements.json: ${tagName}`);
    }

    return metadata;
};

/**
 * Find a declaration in the custom elements manifest by its name and kind, returning null if the declaration is not found or if the manifest is invalid.
 * @param {Package} manifest
 * @param {string} declarationName
 * @param {string} modulePath
 * @returns {ClassDeclaration | null}
 */
const findDeclaration = (manifest, declarationName, modulePath) => {
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
};

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

    return manifest;
}
