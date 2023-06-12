import path from 'path';
import { isRelativeUrl } from '@chialab/node-resolve';
import Jimp from './generator.js';
import { generateIcon } from './generateIcon.js';
import { collectAsset } from './collectAssets.js';

/**
 * @typedef {Object} Icon
 * @property {string} name The icon name.
 * @property {number} size The icon size.
 * @property {Buffer} contents The icon buffer.
 * @property {number} [gutter] The icon gutter.
 * @property {{ r: number; g: number; b: number; a: number; }} [background] The icon background.
 */

const FAVICONS = [
    {
        name: 'favicon-16x16.png',
        size: 16,
    },
    {
        name: 'favicon-32x32.png',
        size: 32,
    },
    {
        name: 'favicon-48x48.png',
        size: 48,
    },
    {
        name: 'favicon-196x196.png',
        size: 196,
    },
];

const APPLE_ICONS = [
    {
        name: 'apple-touch-icon.png',
        size: 180,
        gutter: 30,
        type: 'icon',
        background: { r: 255, g: 255, b: 255, a: 1 },
    },
    {
        name: 'apple-touch-icon-ipad.png',
        size: 167,
        gutter: 30,
        type: 'icon',
        background: { r: 255, g: 255, b: 255, a: 1 },
    },
];

const ICON_SELECTORS = [
    'link[rel="icon"]',
    'link[rel^="icon "]',
    'link[rel$=" icon"]',
    'link[rel *= " icon "]',
];

const APPLE_ICON_SELECTORS = [
    'link[rel="apple-touch-icon"]',
];

/**
 * @param {import('./generator').Image} image The base icon buffer.
 * @param {typeof FAVICONS} favicons
 * @returns {Promise<Icon[]>}
 */
async function generateFavicons(image, favicons) {
    return Promise.all(
        favicons.map(async ({ name, size }) => ({
            name,
            size,
            contents: await generateIcon(image, size, 0, { r: 255, g: 255, b: 255, a: 1 }),
        }))
    );
}

/**
 * @param {import('./generator').Image} image The base icon buffer.
 * @param {typeof APPLE_ICONS} icons
 */
async function generateAppleIcons(image, icons) {
    return Promise.all(
        icons.map(async ({ name, size, gutter, background }) => ({
            name,
            size,
            contents: await generateIcon(image, size, gutter, background),
        }))
    );
}

/**
 * @param {import('cheerio').CheerioAPI} $ The cheerio selector.
 * @param {import('cheerio').Cheerio<import('cheerio').Element>} element The DOM element.
 * @param {Icon} icon The generated icon file.
 * @param {string} rel Rel attribute.
 * @param {boolean} shortcut Should include shortcut.
 * @param {import('./index.js').BuildOptions} options Build options.
 * @param {import('./index.js').Helpers} helpers Helpers.
 * @returns {Promise<import('@chialab/esbuild-rna').OnTransformResult>} Plain build.
 */
export async function collectIcon($, element, icon, rel, shortcut, options, helpers) {
    const entryPoint = path.join(options.sourceDir, icon.name);
    const file = await helpers.emitFile(entryPoint, icon.contents);
    const outpupPath = helpers.resolveRelativePath(file.path, null, '');

    if (icon.size === 196 && shortcut) {
        const link = $('<link>');
        link.attr('rel', 'shortcut icon');
        link.attr('href', outpupPath);
        link.insertBefore(element);
    }

    const link = $('<link>');
    link.attr('rel', rel);
    link.attr('sizes', `${icon.size}x${icon.size}`);
    link.attr('href', outpupPath);
    link.insertBefore(element);

    return {
        ...file,
        watchFiles: [entryPoint],
    };
}

/**
 * Collect and bundle apple icons.
 * @type {import('./index').Collector}
 */
async function collectAppleIcons($, dom, options, helpers) {
    let remove = true;
    let iconElement = dom.find(APPLE_ICON_SELECTORS.join(',')).last();
    if (!iconElement.length) {
        remove = false;
        iconElement = dom.find(ICON_SELECTORS.join(',')).last();
    }

    if (!iconElement.length) {
        return [];
    }

    const iconHref = iconElement.attr('href') || '';
    if (!isRelativeUrl(iconHref)) {
        return [];
    }

    const iconFilePath = await helpers.resolve(iconHref);
    if (!iconFilePath.path) {
        throw new Error(`Failed to resolve icon path: ${iconHref}`);
    }

    const iconFile = await helpers.load(iconFilePath.path, iconFilePath);
    if (!iconFile || !iconFile.contents) {
        throw new Error(`Failed to load icon file: ${iconFilePath.path}`);
    }

    const imageBuffer = Buffer.from(iconFile.contents);

    try {
        const image = await Jimp.read(imageBuffer);
        const icons = await generateAppleIcons(image, APPLE_ICONS);
        const results = await Promise.all(icons.map((icon) => collectIcon($, iconElement, icon, 'apple-touch-icon', false, options, helpers)));
        if (remove) {
            iconElement.remove();
        }

        return results;
    } catch (err) {
        const result = await collectAsset($, iconElement, 'href', options, helpers);
        if (result) {
            return [result];
        }

        return [];
    }
}

/**
 * Collect and bundle favicons.
 * @type {import('./index').Collector}
 */
export async function collectIcons($, dom, options, helpers) {
    const { resolve, load } = helpers;

    const iconElement = dom.find(ICON_SELECTORS.join(',')).last();
    if (!iconElement.length) {
        return [];
    }

    const iconHref = iconElement.attr('href') || '';
    if (!isRelativeUrl(iconHref)) {
        return collectAppleIcons($, dom, options, helpers);
    }

    const iconFilePath = await resolve(iconHref);
    if (!iconFilePath.path) {
        throw new Error(`Failed to resolve icon path: ${iconHref}`);
    }

    const iconFile = await load(iconFilePath.path, iconFilePath);
    if (!iconFile || !iconFile.contents) {
        throw new Error(`Failed to load icon file: ${iconFilePath.path}`);
    }

    const imageBuffer = Buffer.from(iconFile.contents);

    try {
        const image = await Jimp.read(imageBuffer);
        const icons = await generateFavicons(image, FAVICONS);
        const results = await Promise.all(icons.map((icon) => collectIcon($, iconElement, icon, 'icon', true, options, helpers)));
        results.push(...await collectAppleIcons($, dom, options, helpers));
        iconElement.remove();

        return results;
    } catch (err) {
        const result = await collectAsset($, iconElement, 'href', options, helpers);
        if (result) {
            return [result];
        }

        return [];
    }
}
