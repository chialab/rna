/** @import { Plugin } from '../../generate.js' */
import { customElementDecoratorPlugin } from './custom-element-decorator.js';
import { firesDecoratorPlugin } from './fires-decorator.js';
import { iconJSDocTagsPlugin } from './icon-jsdoc-tags.js';
import { inheritancePlugin } from './inheritance.js';
import { localeJSDocTagsPlugin } from './locale-jsdoc-tags.js';
import { memberDenyListPlugin } from './member-denylist.js';
import { methodDenyListPlugin } from './method-denylist.js';
import { propertyDecoratorPlugin } from './property-decorator.js';
import { staticPropertiesPlugin } from './static-properties.js';

/** @type {Plugin[]} */
export const dnaPlugins = [
    customElementDecoratorPlugin(),
    localeJSDocTagsPlugin(),
    iconJSDocTagsPlugin(),
    memberDenyListPlugin(),
    methodDenyListPlugin(),
    propertyDecoratorPlugin(),
    staticPropertiesPlugin(),
    firesDecoratorPlugin(),
    inheritancePlugin(),
];
