/**
 * @import { Attribute, ClassMember, CustomElement, Package, PropertyLike, FunctionLike } from 'custom-elements-manifest'
 * @import { PropDef } from 'storybook/internal/docs-tools'
 */
import { getCustomElementDeclaration, getCustomElementsManifest } from '../framework-api.js';

/**
 * @typedef {PropDef & { table?: { category?: string; defaultValue?: { summary: string } }, control?: { type?: string } | false, defaultValue?: { summary: string } }} CustomElementPropDef
 */

/**
 * @param {(Attribute | ClassMember | PropertyLike)[]} data
 * @param {string} category
 */
function mapData(data, category) {
    return data.reduce(
        (acc, item) => {
            if (!item) {
                return acc;
            }

            const name = item.name || '-';
            const isProperty = category === 'properties';
            const propertyLike = /** @type {PropertyLike | FunctionLike} */ (item);
            /**
             * @type {string[]}
             */
            let types = [];
            if ('type' in propertyLike) {
                types = propertyLike.type?.text.split('|').map((item) => item.trim()) ?? [];
            } else if ('parameters' in propertyLike) {
                types = [
                    `(${propertyLike.parameters?.map((p) => `${p.name}: ${p.type?.text || 'unknown'}`).join(', ') || ''}) => ${propertyLike.return?.type?.text || 'unknown'}`,
                ];
            }

            /** @type {CustomElementPropDef} */
            const entry = {
                name,
                required: types ? types.every((type) => type !== 'undefined') : false,
                description:
                    category === 'attributes'
                        ? `🔗 **${/** @type {Attribute} */ (item).fieldName}**`
                        : item.description,
                type: /** @type {any} */ (
                    types
                        ? {
                              name: types.filter((type) => type !== 'undefined')[0],
                              summary: types.filter((type) => type !== 'undefined')[0] || 'unknown',
                          }
                        : {}
                ),
                table: {
                    category,
                },
                control: isProperty ? undefined : false,
            };
            const defaultValue = /** @type {PropertyLike} */ (item).default;
            if (typeof defaultValue === 'string') {
                entry.defaultValue = {
                    summary: defaultValue,
                };
                entry.table ??= {};
                entry.table.defaultValue = {
                    summary: defaultValue,
                };
            }

            if (isProperty) {
                acc[name] = entry;
            } else {
                acc[`${category}/${name}`] = entry;
            }
            return acc;
        },
        /** @type {Record<string, CustomElementPropDef>} */ ({})
    );
}

/**
 * Extracts argument types from a custom elements manifest for a given tag name, mapping properties, states, attributes, events, slots, CSS properties, CSS parts, methods, static properties, static methods, locales, and icons to Storybook's PropDef format.
 * @param {string} tagName
 * @param {Package} customElements
 * @returns {Record<string, CustomElementPropDef> | null}
 */
export const extractArgTypesFromElements = (tagName, customElements) => {
    /**
     * @param {string} tagName
     * @param {Package} customElements
     */
    const metaData = getCustomElementDeclaration(tagName, customElements);
    if (!metaData) {
        return null;
    }

    const customMetaData =
        /** @type {CustomElement & { locale?: { name: string, description: string }[], icons?: { name: string, description: string }[] }} */ (
            metaData
        );

    return Object.assign(
        /** @type {{ [key: string]: PropDef }} */ ({}),
        customMetaData.members
            ? mapData(
                  customMetaData.members.filter(
                      (m) => m.kind === 'field' && !m.static && !m.static && (!m.privacy || m.privacy === 'public')
                  ),
                  'properties'
              )
            : {},
        customMetaData.members
            ? mapData(
                  customMetaData.members.filter(
                      (m) => m.kind === 'field' && !m.static && !m.static && m.privacy === 'protected'
                  ),
                  'states'
              )
            : {},
        customMetaData.attributes ? mapData(customMetaData.attributes, 'attributes') : {},
        customMetaData.events ? mapData(customMetaData.events, 'events') : {},
        customMetaData.slots ? mapData(customMetaData.slots, 'slots') : {},
        customMetaData.cssProperties ? mapData(customMetaData.cssProperties, 'css custom properties') : {},
        customMetaData.cssParts ? mapData(customMetaData.cssParts, 'css shadow parts') : {},
        customMetaData.members
            ? mapData(
                  customMetaData.members.filter((m) => m.kind === 'method' && !m.static),
                  'methods'
              )
            : {},
        customMetaData.members
            ? mapData(
                  customMetaData.members.filter((m) => m.kind === 'field' && m.static),
                  'static properties'
              )
            : {},
        customMetaData.members
            ? mapData(
                  customMetaData.members.filter((m) => m.kind === 'method' && m.static),
                  'static methods'
              )
            : {},
        customMetaData.locale
            ? customMetaData.locale.reduce(
                  (acc, locale) => {
                      acc[`locale/${locale.name}`] = {
                          name: locale.name,
                          description: locale.description,
                          type: {},
                          table: {
                              category: 'locale',
                          },
                          control: false,
                          required: false,
                      };

                      return acc;
                  },
                  /** @type {Record<string, CustomElementPropDef>} */ ({})
              )
            : {},
        customMetaData.icons
            ? customMetaData.icons.reduce(
                  (acc, icon) => {
                      acc[`icons/${icon.name}`] = {
                          name: icon.name,
                          description: icon.description,
                          type: {},
                          table: {
                              category: 'icons',
                          },
                          control: false,
                          required: false,
                      };

                      return acc;
                  },
                  /** @type {Record<string, CustomElementPropDef>} */ ({})
              )
            : {}
    );
};

/**
 * @param {string} tagName
 */
export const extractArgTypes = (tagName) => {
    const customElements = getCustomElementsManifest();
    if (!customElements) {
        return null;
    }

    return extractArgTypesFromElements(tagName, customElements);
};

/**
 * Extracts the description of a custom element from the custom elements manifest for a given tag name, returning null if the tag name is invalid or not found in the manifest.
 * @param {string} tagName
 * @return {string | null}
 */
export const extractComponentDescription = (tagName) => {
    const customElementsManifest = getCustomElementsManifest();
    if (!customElementsManifest) {
        return null;
    }

    const metaData = getCustomElementDeclaration(tagName, customElementsManifest);
    if (!metaData) {
        return null;
    }

    return metaData.description || null;
};
