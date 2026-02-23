/** @import { Plugin } from '../../generate.js' */
import { memberDenyListPlugin } from './member-denylist.js';
import { methodDenyListPlugin } from './method-denylist.js';
import { propertyDecoratorPlugin } from './property-decorator.js';
import { staticPropertiesPlugin } from './static-properties.js';

/** @type {Plugin[]} */
export const litPlugins = [
    memberDenyListPlugin(),
    methodDenyListPlugin(),
    propertyDecoratorPlugin(),
    staticPropertiesPlugin(),
];
