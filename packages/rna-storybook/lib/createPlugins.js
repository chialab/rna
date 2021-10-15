import { buildPlugin } from './buildPlugin.js';
import { servePlugin } from './servePlugin.js';

/**
 * @typedef {'build'|'serve'} StorybookMode
 */

/**
 * @typedef {Object} StorybookBuild
 * @property {string} manager
 * @property {{ [key: string]: string }} [map]
 * @property {string[]} [modules]
 * @property {string[]} [resolutions]
 */

/**
 * @typedef {Object} StorybookConfig
 * @property {string} type
 * @property {string[]} stories
 * @property {{ [key: string]: string }} [static]
 * @property {string[]} [managerEntries]
 * @property {string[]} [previewEntries]
 * @property {string} [managerHead]
 * @property {string} [previewHead]
 * @property {string} [previewBody]
 * @property {import('@storybook/addons').StorySortParameterV7} [storySort]
 * @property {StorybookBuild} [build]
 */

/**
 * @param {StorybookConfig} config
 * @param {StorybookMode} mode
 */
export function createPlugin(config, mode) {
    if (mode === 'build') {
        return buildPlugin(config);
    }
    if (mode === 'serve') {
        return servePlugin(config);
    }

    throw new Error('Invalid mode. Supported values are "build" and "serve".');
}

/**
 * @param {StorybookConfig} config
 */
export function createPlugins(config) {
    return [
        createPlugin(config, 'build'),
        createPlugin(config, 'serve'),
    ];
}
