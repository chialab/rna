/**
 * @import { PresetProperty } from 'storybook/internal/types'
 */
import { join } from 'node:path';

/** @type {PresetProperty<'previewAnnotations'>} */
export const previewAnnotations = async (input, options) => {
    const docsEnabled = Object.keys(await options.presets.apply('docs', {}, options)).length > 0;
    /** @type {string[]} */
    const result = [];

    return result
        .concat(input ?? [])
        .concat([join(__dirname, 'entry-preview.js')])
        .concat(docsEnabled ? [join(__dirname, 'entry-preview-docs.js')] : []);
};
