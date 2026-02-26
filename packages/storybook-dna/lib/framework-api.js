/// <reference types="./typings.d.ts" />

/**
 * @import { CustomElement, Package } from 'custom-elements-manifest'
 */
import { logger } from 'storybook/internal/client-logger';
import { dedent } from 'ts-dedent';

export * from '@chialab/cem-analyzer/helpers';

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
