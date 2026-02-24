/**
 * @import { PresetProperty } from 'storybook/internal/types'
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {PresetProperty<'previewAnnotations'>} */
export const previewAnnotations = async (input, options) => {
    const docsEnabled = Object.keys(await options.presets.apply('docs', {}, options)).length > 0;
    /** @type {string[]} */
    const result = [];
    const libDir = dirname(fileURLToPath(import.meta.url));

    return result
        .concat(input ?? [])
        .concat([join(libDir, 'entry-preview.js')])
        .concat(docsEnabled ? [join(libDir, 'entry-preview-docs.js')] : []);
};
