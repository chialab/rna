export const patch = `import { customElements } from '@chialab/dna';

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

function patchConnectedCallback(ctr) {
    const connected = ctr.prototype.connectedCallback;
    ctr.prototype.connectedCallback = function() {
        register(this);
        return connected.call(this);
    };
}

function patchDisonnectedCallback(ctr) {
    const disconnected = ctr.prototype.disconnectedCallback;
    ctr.prototype.disconnectedCallback = function() {
        unregister(this);
        return disconnected.call(this);
    };
}

const define = customElements.define.bind(customElements);
customElements.define = function(name, ctr, options) {
    patchConnectedCallback(ctr);
    patchDisonnectedCallback(ctr);

    const actual = customElements.get(name);
    if (!actual) {
        define(name, ctr, options);
    } else {
        Object.setPrototypeOf(actual, ctr);
        Object.setPrototypeOf(actual.prototype, ctr.prototype);

        const connected = connectedNodes.get(name) || [];
        connected.forEach((node) => {
            node.forceUpdate();
        });
    }
};
`;
