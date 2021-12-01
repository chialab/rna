import './fixMdxParser.js';

/**
 * @typedef {'build'|'serve'} StorybookMode
 */

/**
 * @typedef {Object} StorybookBuild
 * @property {string} manager
 * @property {{ [key: string]: string }} [modules]
 * @property {string[]} [resolutions]
 */

/**
 * @typedef {Object} StorybookConfig
 * @property {string} framework
 * @property {string} manager
 * @property {string[]} stories
 * @property {{ [key: string]: string }} [static]
 * @property {string[]} [managerEntries]
 * @property {string[]} [previewEntries]
 * @property {string} [managerHead]
 * @property {string} [previewHead]
 * @property {string} [previewBody]
 * @property {import('@storybook/addons').StorySortParameterV7} [storySort]
 */

export * from './findStories.js';
export * from './createManager.js';
export * from './createPreview.js';
export * from './transformMdxToCsf.js';
export * from './buildPlugin.js';
export * from './servePlugin.js';
export { default as cemAnalyzer } from './cemAnalyzer.js';
export { mdxPlugin } from './mdxPlugin.js';
