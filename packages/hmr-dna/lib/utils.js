/**
 * @import { ComponentInstance } from '@chialab/dna'
 */
import { getProperties } from '@chialab/dna';

/**
 * Clone element property values.
 * @template {ComponentInstance} T
 * @param {T} node The node.
 * @returns {{ [K in keyof T]: T[K] }} A record of properties.
 */
export function cloneProperties(node) {
    const computedProperties = getProperties(node);
    const actualProperties = /** @type {{ [K in keyof T]: T[K] }} */ ({});
    for (const propertyKey in computedProperties) {
        actualProperties[propertyKey] = node.getInnerPropertyValue(propertyKey);
    }

    return actualProperties;
}

/**
 * Override class prototype.
 * @param {CustomElementConstructor} targetClass Target class.
 * @param {CustomElementConstructor} sourceClass Soure class.
 */
export function overridePrototype(targetClass, sourceClass) {
    const prototype = sourceClass.prototype;
    const superConstructor = Object.getPrototypeOf(sourceClass);
    const Ctr = class extends superConstructor {
        /**
         * @param {...unknown} args
         */

        // biome-ignore lint/correctness/noUnreachableSuper: We need to override the source constructor with the target constructor.
        constructor(...args) {
            if (new.target === sourceClass) {
                // biome-ignore lint/correctness/noConstructorReturn: We need to return a new target constructor instance instead of the source constructor instance.
                return new targetClass(...args);
            }
            super(...args);
        }
    };
    // Move Symbol.metadata to the new constructor.
    if (Symbol.metadata && Object.prototype.hasOwnProperty.call(sourceClass, Symbol.metadata)) {
        Object.defineProperty(Ctr, Symbol.metadata, {
            writable: false,
            configurable: true,
            value: sourceClass[Symbol.metadata],
        });
        sourceClass[Symbol.metadata] = null;
    }
    Object.setPrototypeOf(sourceClass, Ctr);
    Object.setPrototypeOf(sourceClass.prototype, Ctr.prototype);
    Object.setPrototypeOf(targetClass, sourceClass);
    Object.setPrototypeOf(targetClass.prototype, prototype);
}
