/**
 * @import { ComponentConstructor, ComponentInstance } from '@chialab/dna'
 */
import { isComponentConstructor } from '@chialab/dna';
import { connect, disconnect } from './connectedRegistry';

/**
 * A map of registered custom element proxies.
 * @type {Map<string, ComponentConstructor>}
 */
const proxies = new Map();

/**
 * Create a proxy class for the custom element.
 * @template {ComponentInstance} T
 * @param {string} name The custom element name.
 * @param {ComponentConstructor<T>} ctr The custom element constructor.
 * @returns {ComponentConstructor<T>}
 */
export function createProxy(name, ctr) {
    if (proxies.get(name)) {
        return /** @type {ComponentConstructor<T>} */ (proxies.get(name));
    }

    if (isComponentConstructor(ctr)) {
        const ProxyClass = class extends /** @type {ComponentConstructor} */ (ctr) {
            // we need to override the constructor in order to proxy it in the future.
            /**
             * @param {...unknown} args
             */
            constructor(...args) {
                super(...args);
                if (new.target === ProxyClass) {
                    this.initialize();
                }
            }

            connectedCallback() {
                connect(this);
                super.connectedCallback();
            }

            disconnectedCallback() {
                disconnect(this);
                super.disconnectedCallback();
            }
        };

        proxies.set(name, /** @type {ComponentConstructor} */ (/** @type {unknown} */ (ProxyClass)));

        return /** @type {ComponentConstructor<T>} */ (/** @type {unknown} */ (ProxyClass));
    }

    return /** @type {ComponentConstructor<T>} */ (ctr);
}
