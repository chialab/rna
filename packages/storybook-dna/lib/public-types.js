/**
 * @import { AnnotatedStoryFn, Args, ComponentAnnotations, DecoratorFunction, StoryContext as GenericStoryContext, LoaderFunction, ProjectAnnotations, StoryAnnotations, StrictArgs } from 'storybook/internal/types'
 * @import { DnaRenderer } from './types'
 */

/**
 * @template {Args} [TArgs=Args]
 * @typedef {ComponentAnnotations<DnaRenderer, TArgs>} Meta Metadata to configure the stories for a component.
 * @see [Default export](https://storybook.js.org/docs/api/csf#default-export)
 */

/**
 * @template {Args} [TArgs=Args]
 * @typedef {AnnotatedStoryFn<DnaRenderer, TArgs>} StoryFn Story function that represents a CSFv2 component example.
 * @see [Named Story exports](https://storybook.js.org/docs/api/csf#named-story-exports)
 */

/**
 * @template {Args} [TArgs=Args]
 * @typedef {StoryAnnotations<DnaRenderer, TArgs>} StoryObj Story object that represents a CSFv3 component example.
 * @see [Named Story exports](https://storybook.js.org/docs/api/csf#named-story-exports)
 */

/**
 * @template {StrictArgs} [TArgs=StrictArgs]
 * @typedef {DecoratorFunction<DnaRenderer, TArgs>} Decorator
 */

/**
 * @template {StrictArgs} [TArgs=StrictArgs]
 * @typedef {LoaderFunction<DnaRenderer, TArgs>} Loader
 */

/**
 * @template {StrictArgs} [TArgs=StrictArgs]
 * @typedef {GenericStoryContext<DnaRenderer, TArgs>} StoryContext
 */

/** @typedef {ProjectAnnotations<DnaRenderer>} Preview */

export {};
