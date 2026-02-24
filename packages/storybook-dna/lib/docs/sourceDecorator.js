/**
 * @import { Template, VObject } from '@chialab/dna'
 * @import { PartialStoryFn, StoryContext } from 'storybook/internal/types'
 * @import { DnaRenderer } from '../types.js'
 */
import { Fragment, getProperties, isComponentConstructor } from '@chialab/dna';
import { logger } from 'storybook/internal/client-logger';
import { SourceType } from 'storybook/internal/docs-tools';
import { emitTransformCode, useEffect } from 'storybook/internal/preview-api';

/**
 * @param {unknown} value
 * @returns {value is object}
 */
function isObject(value) {
    if (value === null) {
        return false;
    }
    if (typeof value === 'object') {
        return true;
    }
    if (typeof value !== 'string') {
        return false;
    }
    const trimmedValue = value.trim();
    if (trimmedValue[0] !== '{' && trimmedValue[0] !== '[') {
        return false;
    }
    try {
        return typeof JSON.parse(trimmedValue) === 'object';
    } catch {
        return false;
    }
}

/**
 * @param {unknown} value
 * @returns {value is unknown[]}
 */
function isArray(value) {
    if (Array.isArray(value)) {
        return true;
    }
    if (typeof value !== 'string') {
        return false;
    }
    const trimmedValue = value.trim();
    if (trimmedValue[0] !== '[') {
        return false;
    }
    try {
        return Array.isArray(JSON.parse(trimmedValue));
    } catch {
        return false;
    }
}

/**
 * @param {unknown} value
 * @returns {value is (...args: unknown[]) => unknown}
 */
function isFunction(value) {
    return typeof value === 'function';
}

const voidElements = [
    'area',
    'base',
    'basefont',
    'bgsound',
    'br',
    'col',
    'command',
    'embed',
    'frame',
    'hr',
    'image',
    'img',
    'input',
    'isindex',
    'keygen',
    'link',
    'menuitem',
    'meta',
    'nextid',
    'param',
    'source',
    'track',
    'wbr',
];

const inlineElements = [
    'a',
    'abbr',
    'acronym',
    'b',
    'bdi',
    'bdo',
    'big',
    'br',
    'data',
    'del',
    'dfn',
    'em',
    'i',
    'ins',
    'kbd',
    'mark',
    'q',
    'ruby',
    's',
    'samp',
    'small',
    'span',
    'strong',
    'sub',
    'sup',
    'time',
    'u',
    'tt',
    'var',
    'wbr',
];

const simpleBlockElements = ['button', 'h1', 'h2', 'h3', 'h4', 'h5'];

/**
 * @param {string} input
 */
function escapeHtml(input) {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * @param {Template} vnode
 * @returns {string}
 */
function vnodeToString(vnode) {
    if (vnode == null) {
        return '';
    }
    if (typeof vnode !== 'object') {
        return vnode ? String(vnode) : '';
    }
    if (Array.isArray(vnode)) {
        return vnode.map(vnodeToString).join('\n');
    }
    if (vnode instanceof Element) {
        return vnode.outerHTML;
    }
    if (vnode instanceof Node) {
        return vnode.textContent || '';
    }

    const hyperObject = /** @type {VObject} */ (vnode);
    const children = hyperObject.children
        ? Array.isArray(hyperObject.children)
            ? hyperObject.children
            : [hyperObject.children]
        : [];

    if (hyperObject.type === Fragment) {
        return children.map(vnodeToString).join('\n');
    }

    const tag =
        (typeof hyperObject.type === 'string' && hyperObject.type) ||
        (hyperObject.type instanceof Element && hyperObject.type.tagName) ||
        '#unknown';

    if (tag === 'style') {
        return '';
    }

    const properties = { ...hyperObject.properties };
    const typedProperties = /** @type {Record<string, unknown>} */ (properties);
    const ctr = customElements.get(properties.is || tag);
    const definedProperties = ctr && isComponentConstructor(ctr) ? getProperties(ctr.prototype) : null;
    const typedDefinedProperties = /** @type {Record<string, any> | null} */ (definedProperties);

    const attrs = Object.keys(properties)
        .map((prop) => {
            if (prop === 'ref' || prop === 'children' || prop === 'class' || prop === 'style') {
                return false;
            }

            if (prop === 'is') {
                return `is="${typedProperties[prop]}"`;
            }

            let value = typedProperties[prop];
            if (value == null) {
                return false;
            }

            const definedProperty = typedDefinedProperties?.[prop];
            if (definedProperty?.defaultValue === value) {
                return false;
            }

            const toAttribute = definedProperty?.toAttribute;
            if (typeof toAttribute === 'function' && ctr) {
                value = toAttribute.call(ctr.prototype, value) ?? value;
            }
            const normalizedProp = definedProperty?.attribute ?? prop;

            if (value == null || value === false) {
                return false;
            }
            if (isArray(value)) {
                value = '[...]';
            }
            if (value instanceof Date) {
                value = value.toISOString();
            }
            if (isObject(value)) {
                value = '{...}';
            }
            if (isFunction(value)) {
                return `${normalizedProp}="..."`;
            }
            if (value === true || value === '') {
                return normalizedProp;
            }
            return `${normalizedProp}="${escapeHtml(`${value}`)}"`;
        })
        .filter(Boolean)
        .join(' ');

    if (typeof hyperObject.type === 'function') {
        return `<${hyperObject.type.name}${attrs ? ` ${attrs}` : ''} />`;
    }

    const tagBlock = inlineElements.includes(tag) ? '' : '\n';
    const childrenBlock = [...inlineElements, ...simpleBlockElements].includes(tag) ? '' : '\n';
    if (voidElements.includes(tag)) {
        return `${tagBlock}<${tag}${attrs ? ` ${attrs}` : ''} />${tagBlock}`;
    }
    if (!children.length) {
        return `${tagBlock}<${tag}${attrs ? ` ${attrs}` : ''}></${tag}>${tagBlock}`;
    }

    const prefix = ''.padStart(4, ' ');
    const childContents = children
        .reduce(
            (acc, child) => {
                let convertedChild = child;
                if (typeof child !== 'object') {
                    convertedChild = vnodeToString(child);
                } else if (child instanceof Node) {
                    convertedChild = vnodeToString(child);
                }

                if (typeof convertedChild === 'string' && typeof acc[acc.length - 1] === 'string') {
                    acc[acc.length - 1] += convertedChild;
                } else {
                    acc.push(convertedChild);
                }

                return acc;
            },
            /** @type {(Template | string)[]} */ ([])
        )
        .map(/** @param {Template | string} child */ (child) => vnodeToString(child).replace(/\n/g, `\n${prefix}`));

    return `${tagBlock}<${tag}${attrs ? ` ${attrs}` : ''}>${
        childrenBlock ? `${childrenBlock}${prefix}` : ''
    }${childContents.join('')}${childrenBlock}</${tag}>${tagBlock}`;
}

/**
 * @param {StoryContext} context
 * @returns {boolean}
 */
function shouldSkipSourceCodeGeneration(context) {
    const sourceParams = context?.parameters.docs?.source;
    if (sourceParams?.type === SourceType.DYNAMIC) {
        return false;
    }

    const isArgsStory = context?.parameters.__isArgsStory;

    return !isArgsStory || sourceParams?.code || sourceParams?.type === SourceType.CODE;
}

/**
 * Decorator that generates the source code for a story by converting its rendered output (a virtual DOM node) into a string representation of the corresponding HTML, and emits this code to Storybook's Docs addon for display in the documentation panel.
 * @param {PartialStoryFn<DnaRenderer>} storyFn
 * @param {StoryContext<DnaRenderer>} context
 * @returns {DnaRenderer['storyResult']}
 */
export function sourceDecorator(storyFn, context) {
    const story = storyFn();
    const source = (() => {
        try {
            return vnodeToString(story).replace(/\n\s*\n+/g, '\n');
        } catch (err) {
            logger.error(err);
            return '';
        }
    })();

    useEffect(() => {
        if (shouldSkipSourceCodeGeneration(context)) {
            return;
        }
        emitTransformCode(source, context);
    });

    return story;
}
