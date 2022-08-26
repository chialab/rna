export const patch = `import { getProperties, customElements } from '@chialab/dna';

const connectedNodes = new Map();

function register(node) {
    const list = connectedNodes.get(node.is) || [];
    connectedNodes.set(node.is, list);
    list.push(node);
}

function unregister(node) {
    const list = connectedNodes.get(node.is) || [];
    if (list.includes(node)) {
        list.splice(list.indexOf(node), 1);
    }
}

const proxies = new Map();
const classes = new Map();

const registryDefine = window.customElements.define.bind(window.customElements);
window.customElements.define = function(name, ctr, options) {
    if (!window.customElements.get(name)) {
        registryDefine(name, proxies.get(name), options);
    }
};

const define = customElements.define.bind(customElements);
customElements.define = function(name, ctr, options) {
    const actual = classes.get(name);
    const connected = connectedNodes.get(name) || [];
    connected.forEach((node) => {
        const computedProperties = getProperties(node);
        const actualProperties = {};
        for (const propertyKey in computedProperties) {
            actualProperties[propertyKey] = node.getInnerPropertyValue(propertyKey);
        }

        node.__actualProperties__ = actualProperties;
    });

    const proxyClass = proxies.get(name) || class extends ctr {
        constructor(...args) {
            super(...args);
        }

        connectedCallback() {
            register(this);
            super.connectedCallback();
        }

        disconnectedCallback() {
            unregister(this);
            super.disconnectedCallback();
        }
    };
    classes.set(name, ctr);
    proxies.set(name, proxyClass);

    if (actual) {
        Object.setPrototypeOf(proxyClass, ctr);
        Object.setPrototypeOf(proxyClass.prototype, ctr.prototype);
    }

    delete customElements.registry[name];
    define(name, proxyClass, options);

    if (!actual) {
        return;
    }

    connected.forEach((node) => {
        const computedProperties = getProperties(node);
        const actualProperties = node.__actualProperties__ || {};
        let initializedProperties;
        for (const propertyKey in computedProperties) {
            if (propertyKey in actualProperties) {
                node.setInnerPropertyValue(propertyKey, actualProperties[propertyKey]);
            } else {
                const property = computedProperties[propertyKey];
                if (typeof property.initializer === 'function') {
                    node[propertyKey] = property.initializer.call(node);
                } else if (typeof property.defaultValue !== 'undefined') {
                    node[propertyKey] = property.defaultValue;
                } else if (!property.static) {
                    initializedProperties = initializedProperties || new proxyClass();
                    node.setInnerPropertyValue(propertyKey, initializedProperties[propertyKey]);
                }
                node.watchedProperties.push(propertyKey);
            }
        }
        delete node.__actualProperties__;
        node.forceUpdate();
    });
};
`;
