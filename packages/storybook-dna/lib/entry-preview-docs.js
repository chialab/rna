/**
 * @import { ArgTypesEnhancer, DecoratorFunction } from 'storybook/internal/types'
 * @import { DnaRenderer } from './types.js'
 */
import { enhanceArgTypes, SourceType } from 'storybook/internal/docs-tools';
import { extractArgTypes, extractComponentDescription } from './docs/custom-elements.js';
import { prepareForInline } from './docs/prepareForInline.js';
import { sourceDecorator } from './docs/sourceDecorator.js';

/** @type {DecoratorFunction<DnaRenderer>[]} */
export const decorators = [sourceDecorator];

export const parameters = {
    docs: {
        extractArgTypes,
        extractComponentDescription,
        story: {
            inline: true,
        },
        prepareForInline,
        source: {
            type: SourceType.DYNAMIC,
            language: 'html',
        },
    },
};

/** @type {ArgTypesEnhancer<DnaRenderer>[]} */
export const argTypesEnhancers = [enhanceArgTypes];
