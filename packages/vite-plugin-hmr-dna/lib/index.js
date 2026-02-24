/**
 * @import { Plugin } from 'vite'
 */
import MagicString from 'magic-string';
import { mergeConfig } from 'vite';

/**
 * Check if module body contains DNA component definitions.
 * @param {string} body The file contents.
 */
function containsComponent(body) {
    if (body.includes('customElement(')) {
        return true;
    }

    if (body.includes('customElements.define(')) {
        return true;
    }

    return false;
}

/**
 * @returns {Plugin}
 */
export function hmrPlugin() {
    return {
        name: 'hmr-dna',

        config(config) {
            return mergeConfig(config, {
                optimizeDeps: {
                    include: ['@chialab/hmr-dna'],
                },
            });
        },

        transform(body, id) {
            if (!containsComponent(body) || id.includes('/node_modules/')) {
                return;
            }

            const output = new MagicString(body);
            output.prepend("import '@chialab/hmr-dna';");
            output.append('if (import.meta.hot) { import.meta.hot.accept(); }');

            return {
                code: output.toString(),
                map: output.generateMap(),
            };
        },
    };
}
