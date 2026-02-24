/**
 * @import { HTMLTagNameMap } from '@chialab/dna'
 * @import { ArgsStoryFn, RenderContext } from 'storybook/internal/types'
 * @import { DnaRenderer } from './types.js'
 */
import { $parse, render as dnaRender, h } from '@chialab/dna';
import { simulateDOMContentLoaded, simulatePageLoad } from 'storybook/internal/preview-api';
import { dedent } from 'ts-dedent';

/** @type {ArgsStoryFn<DnaRenderer>} */
export const render = (args, context) => {
    const { id, component } = context;
    if (!component) {
        throw new Error(`Unable to render story ${id} as the component annotation is missing from the default export`);
    }

    return h(/** @type {keyof HTMLTagNameMap} */ (component), args);
};

/**
 * @param {RenderContext<DnaRenderer>} context
 * @param {Element} canvasElement
 */
export function renderToCanvas({ storyFn, title, name, showMain, showError, forceRemount }, canvasElement) {
    if (forceRemount) {
        dnaRender(null, canvasElement);
    }

    const element = storyFn();

    showMain();

    try {
        const containerAttrs = {
            key: name,
            style: { display: 'contents' },
            'data-story-name': name,
        };
        if (typeof element === 'string') {
            canvasElement.innerHTML = element;
            dnaRender(h('div', containerAttrs, $parse(element)), canvasElement);
            customElements.upgrade(canvasElement);
            simulatePageLoad(canvasElement);
        } else if (element instanceof Node) {
            // Don't re-mount the element if it didn't change and neither did the story
            if (canvasElement.firstChild === element && forceRemount === true) {
                return;
            }

            canvasElement.innerHTML = '';
            dnaRender(h('div', containerAttrs, element), canvasElement);
            simulateDOMContentLoaded();
        } else {
            dnaRender(h('div', containerAttrs, element), canvasElement);
            simulatePageLoad(canvasElement);
        }
    } catch (err) {
        showError({
            title: `An error occurred rendering the story: "${name}" of "${title}".`,
            description: dedent(/** @type {Error} */ (err).message),
        });
    }

    return () => {
        dnaRender(null, canvasElement);
        canvasElement.innerHTML = '';
    };
}
