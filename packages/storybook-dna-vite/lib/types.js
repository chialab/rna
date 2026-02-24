/**
 * @import { StorybookConfig as StorybookConfigBase } from 'storybook/internal/types';
 * @import { BuilderOptions, StorybookConfigVite } from '@storybook/builder-vite';
 */

/** @typedef {'@chialab/storybook-dna-vite'} FrameworkName */
/** @typedef {'@storybook/builder-vite'} BuilderName */
/** @typedef {{ builder?: BuilderOptions }} FrameworkOptions */
/** @typedef {{ framework: FrameworkName | { name: FrameworkName, options: FrameworkOptions }, core?: StorybookConfigBase['core'] & { builder?: BuilderName | { name: BuilderName, options: BuilderOptions } } }} StorybookConfigFramework */

/**
 * The interface for Storybook configuration in `main.ts` files.
 */
/** @typedef {Omit<StorybookConfigBase, keyof StorybookConfigVite | keyof StorybookConfigFramework> & StorybookConfigVite & StorybookConfigFramework} StorybookConfig */

export {};
