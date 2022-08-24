import { hmrPlugin as baseHmrPlugin } from '@open-wc/dev-server-hmr';

const patch = `import { Component, customElements, isComponent, isComponentConstructor } from '@chialab/dna';

const patch = (ctr) => {
    if (isComponentConstructor(ctr)) {
        if (!patch(Object.getPrototypeOf(ctr))) {
            const shim = Object.getPrototypeOf(ctr);
            const original = Object.getPrototypeOf(shim);
            Object.setPrototypeOf(ctr.prototype, original.prototype);
            Object.setPrototypeOf(ctr, original);
        }
        return true;
    }
    return false;
};

const define = customElements.define.bind(customElements);
customElements.define = function(name, ctr, options) {
    if (!customElements.get(name)) {
        patch(ctr);
        define(name, ctr, options);
    }
};

HTMLElement.prototype.hotReplacedCallback = function hotReplacedCallback() {
    if (isComponent(this)) {
        this.forceUpdate();
    }
};
`;

/**
 * Create dna hmr plugin.
 * @param {import('@open-wc/dev-server-hmr').WcHmrPluginConfig} options
 * @returns HMR plugin.
 */
export function hmrPlugin(options) {
    return baseHmrPlugin({
        decorators: [{ name: 'customElement', import: '@chialab/dna' }],
        baseClasses: [{ name: 'Component', import: '@chialab/dna' }],
        patches: [patch],
        ...options,
    });
}
