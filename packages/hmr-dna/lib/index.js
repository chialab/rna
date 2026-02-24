/**
 * @import { ComponentConstructor, ComponentInstance } from '@chialab/dna'
 */
import { getProperties, isComponentConstructor } from '@chialab/dna';
import { createProxy } from './CustomElementProxy';
import { getConnected } from './connectedRegistry';
import { defineOnce } from './defineOnce';
import { cloneProperties, overridePrototype } from './utils';

/**
 * Store the DNA customElements.define method.
 */
/**
 * @type {(name: string, ctr: CustomElementConstructor, options?: ElementDefinitionOptions) => void}
 */
const defineCustomElement = defineOnce;

/**
 * Define a DNA component with HMR support.
 * @template {ComponentInstance} T
 * @param {string} name The custom element name.
 * @param {ComponentConstructor<T> | CustomElementConstructor} ctr The custom element constructor.
 * @param {ElementDefinitionOptions} [options] Definition options.
 */
customElements.define = function hmrDefine(name, ctr, options) {
    if (!isComponentConstructor(ctr)) {
        return defineCustomElement(name, ctr, options);
    }

    const actual = customElements.get(name);
    const connected = /** @type {T[]} */ (getConnected(name));

    /** @type {Map<T, { [K in keyof T]: T[K] }>} */
    const connectedProperties = new Map();
    connected.forEach((node) => {
        connectedProperties.set(node, cloneProperties(node));
    });

    const proxyClass = createProxy(name, ctr);
    overridePrototype(proxyClass, ctr);
    defineCustomElement(name, proxyClass, options);

    if (!actual) {
        return;
    }

    connected.forEach((node) => {
        const computedProperties = getProperties(node);
        const actualProperties = connectedProperties.get(node) || /** @type {{ [K in keyof T]: T[K] }} */ ({});
        /** @type {T | undefined} */
        let initializedProperties;
        for (const propertyKey in computedProperties) {
            const key = /** @type {keyof T} */ (propertyKey);
            const value = actualProperties[propertyKey];
            if (value !== undefined) {
                node.setInnerPropertyValue(key, value);
            } else {
                const property = computedProperties[key];
                if (property) {
                    if (typeof property.initializer === 'function') {
                        node[key] = property.initializer.call(node);
                    } else if (typeof property.defaultValue !== 'undefined') {
                        node[key] = property.defaultValue;
                    } else if (!property.static) {
                        initializedProperties ??= /** @type {T} */ (new proxyClass());
                        const initialNode = /** @type {T} */ (initializedProperties);
                        node.setInnerPropertyValue(key, initialNode[key]);
                    }
                }
            }
        }
        connectedProperties.delete(node);
        node.requestUpdate();
    });
};
