import { isComponentConstructor } from '@chialab/dna';

/**
 * Store the browser customElements.define method.
 */
const customElementsDefine = customElements.define.bind(customElements);

/**
 * Use browser APIs to define a custom element only once.
 * @param {string} name The custom element name.
 * @param {CustomElementConstructor} ctr The custom element constructor.
 * @param {ElementDefinitionOptions} [options] Definition options.
 */
export function defineOnce(name, ctr, options) {
    if (!customElements.get(name) || !isComponentConstructor(ctr)) {
        customElementsDefine(name, ctr, options);
    }
}
