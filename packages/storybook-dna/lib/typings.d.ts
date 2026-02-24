import type { Package } from 'custom-elements-manifest';

declare const STORYBOOK_ENV: 'dna';
declare const __STORYBOOK_CUSTOM_ELEMENTS_MANIFEST__: Package | undefined;
declare const __STORYBOOK_CUSTOM_ELEMENTS__: never;
declare const LOGLEVEL: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent' | undefined;

declare global {
    interface Window {
        STORYBOOK_ENV: 'dna';
        __STORYBOOK_CUSTOM_ELEMENTS_MANIFEST__: Package | undefined;
    }
}
