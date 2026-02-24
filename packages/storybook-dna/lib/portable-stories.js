/**
 * @import { Args, ComposedStoryFn, NamedOrDefaultProjectAnnotations, NormalizedProjectAnnotations, ProjectAnnotations, Store_CSFExports, StoriesWithPartialProps, StoryAnnotationsOrFn } from 'storybook/internal/types'
 * @import { Meta } from './public-types.js'
 * @import { DnaRenderer } from './types.js'
 */
import { h } from '@chialab/dna';
import {
    composeStories as originalComposeStories,
    composeStory as originalComposeStory,
    setProjectAnnotations as originalSetProjectAnnotations,
    setDefaultProjectAnnotations,
} from 'storybook/preview-api';
import * as dnaAnnotations from './entry-preview.js';

/**
 * Function that sets the globalConfig of your storybook. The global config is the preview module of
 * your .storybook folder.
 *
 * It should be run a single time, so that your global config (e.g. decorators) is applied to your
 * stories when using `composeStories` or `composeStory`.
 *
 * Example:
 *
 * ```jsx
 * // setup-file.js
 * import { setProjectAnnotations } from '@chialab/storybook-dna';
 * import projectAnnotations from './.storybook/preview';
 *
 * setProjectAnnotations(projectAnnotations);
 * ```
 *
 * @template {DnaRenderer} [TRenderer=DnaRenderer]
 * @param {NamedOrDefaultProjectAnnotations<TRenderer> | NamedOrDefaultProjectAnnotations<TRenderer>[]} projectAnnotations - E.g. (import projectAnnotations from '../.storybook/preview')
 * @returns {NormalizedProjectAnnotations<DnaRenderer>}
 */
export function setProjectAnnotations(projectAnnotations) {
    setDefaultProjectAnnotations(dnaAnnotations);

    return /** @type {NormalizedProjectAnnotations<DnaRenderer>} */ (
        /** @type {unknown} */ (originalSetProjectAnnotations(projectAnnotations))
    );
}

/**
 * Function that will receive a story along with meta (e.g. a default export from a .stories file)
 * and optionally projectAnnotations e.g. (import * from '../.storybook/preview) and will return a
 * composed component that has all args/parameters/decorators/etc combined and applied to it.
 *
 * It's very useful for reusing a story in scenarios outside of Storybook like unit testing.
 *
 * @template {Args} [TArgs=Args]
 * @param {StoryAnnotationsOrFn<DnaRenderer, TArgs>} story
 * @param {Meta<TArgs | any>} componentAnnotations - E.g. (import Meta from './Button.stories')
 * @param {ProjectAnnotations<DnaRenderer>} [projectAnnotations] - E.g. (import * as projectAnnotations from '../.storybook/preview') this can be applied automatically if you use `setProjectAnnotations` in your setup files.
 * @param {string} [exportsName] - In case your story does not contain a name and you want it to have a name.
 * @returns {ComposedStoryFn<DnaRenderer, Partial<TArgs>>}
 */
export function composeStory(story, componentAnnotations, projectAnnotations, exportsName) {
    const composedStory = originalComposeStory(
        /** @type {StoryAnnotationsOrFn<DnaRenderer, Args>} */ (story),
        componentAnnotations,
        projectAnnotations,
        globalThis.globalProjectAnnotations ?? dnaAnnotations,
        exportsName
    );

    /**
     * @param  {Parameters<typeof composedStory>} args
     */
    const renderable = (...args) => h(composedStory(...args));
    Object.assign(renderable, composedStory);

    return /** @type {ComposedStoryFn<DnaRenderer, Partial<TArgs>>} */ (renderable);
}

/**
 * Function that will receive a stories import (e.g. `import * as stories from './Button.stories'`)
 * and optionally projectAnnotations (e.g. `import * from '../.storybook/preview`) and will return
 * an object containing all the stories passed, but now as a composed component that has all
 * args/parameters/decorators/etc combined and applied to it.
 *
 * It's very useful for reusing stories in scenarios outside of Storybook like unit testing.
 *
 * @template {Store_CSFExports<DnaRenderer, any>} TModule
 * @param {TModule} csfExports - E.g. (import * as stories from './Button.stories')
 * @param {ProjectAnnotations<DnaRenderer>} [projectAnnotations] - E.g. (import * as projectAnnotations from '../.storybook/preview') this can be applied automatically if you use `setProjectAnnotations` in your setup files.
 */
export function composeStories(csfExports, projectAnnotations) {
    const composedStories = originalComposeStories(
        csfExports,
        /** @type {ProjectAnnotations<DnaRenderer>} */ (projectAnnotations),
        composeStory
    );

    return /** @type {Omit<StoriesWithPartialProps<DnaRenderer, TModule>, keyof Store_CSFExports>} */ (composedStories);
}

/**
 * Prepares and renders a story into a given root element.
 *
 * This is useful for testing or embedding stories outside of Storybook.
 *
 * @template {Args} [TArgs=Args]
 * @param {StoryAnnotationsOrFn<DnaRenderer, TArgs>} story
 * @param {HTMLElement} rootElement - The root element where to render the story.
 * @param {Partial<TArgs>} [args] - Optional args to pass to the story.
 * @param {Meta<TArgs | any>} [componentAnnotations] - E.g. (import Meta from './Button.stories')
 * @param {ProjectAnnotations<DnaRenderer>} [projectAnnotations] - E.g. (import * as projectAnnotations from '../.storybook/preview') this can be applied automatically if you use `setProjectAnnotations` in your setup files.
 * @param {string} [exportsName] - In case your story does not contain a name and you want it to have a name.
 */
export async function renderStory(story, rootElement, args, componentAnnotations, projectAnnotations, exportsName) {
    const composedStory = composeStory(story, componentAnnotations || {}, projectAnnotations, exportsName);

    await composedStory.run({
        canvasElement: rootElement,
        args: {
            ...(composedStory.args || {}),
            ...(args || {}),
        },
    });
}
