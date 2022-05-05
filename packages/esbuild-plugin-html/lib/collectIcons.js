import path from 'path';
import { isRelativeUrl } from '@chialab/node-resolve';
import Jimp from './generator.js';
import { generateIcon } from './generateIcon.js';

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
 * Collect and bundle apple icons.
 * @type {import('./index').Collector}
 */
async function collectAppleIcons($, dom, options, { resolve, load }) {
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

    const iconFilePath = await resolve(iconHref);
    if (!iconFilePath.path) {
        throw new Error(`Failed to resolve icon path: ${iconHref}`);
    }

    const iconFile = await load(iconFilePath.path, iconFilePath);
    if (!iconFile.contents) {
        throw new Error(`Failed to load icon file: ${iconFilePath.path}`);
    }

    const imageBuffer = Buffer.from(iconFile.contents);

    /**
     * @type {InstanceType<Jimp>}
     */
    let image;
    try {
        image = await Jimp.read(imageBuffer);
    } catch (err) {
        return [
            {
                build: {
                    loader: 'file',
                    entryPoint: iconHref,
                },
                finisher(files) {
                    iconElement.attr('href', files[0]);
                },
            },
        ];
    }

    const icons = await generateAppleIcons(image, APPLE_ICONS);

    return [
        ...icons.map((icon) => /** @type {import('./index.js').CollectResult} */({
            build: {
                entryPoint: path.join(options.sourceDir, icon.name),
                contents: icon.contents,
                loader: 'file',
                outdir: 'icons',
            },
            async finisher(files) {
                const link = $('<link>');
                link.attr('rel', 'apple-touch-icon');
                link.attr('sizes', `${icon.size}x${icon.size}`);
                link.attr('href', files[0]);
                link.insertBefore(iconElement);
            },
        })),
        ...(remove ? [{
            finisher() {
                iconElement.remove();
            },
        }] : []),
    ];
}

/**
 * Collect and bundle favicons.
 * @type {import('./index').Collector}
 */
export async function collectIcons($, dom, options, api) {
    const { resolve, load } = api;
    const appleIcons = collectAppleIcons($, dom, options, api);

    const iconElement = dom.find(ICON_SELECTORS.join(',')).last();
    if (!iconElement.length) {
        return [];
    }

    const iconHref = iconElement.attr('href') || '';
    if (!isRelativeUrl(iconHref)) {
        return appleIcons;
    }

    const iconFilePath = await resolve(iconHref);
    if (!iconFilePath.path) {
        throw new Error(`Failed to resolve icon path: ${iconHref}`);
    }

    const iconFile = await load(iconFilePath.path, iconFilePath);
    if (!iconFile.contents) {
        throw new Error(`Failed to load icon file: ${iconFilePath.path}`);
    }

    const imageBuffer = Buffer.from(iconFile.contents);

    /**
     * @type {InstanceType<Jimp>}
     */
    let image;
    try {
        image = await Jimp.read(imageBuffer);
    } catch (err) {
        return [
            {
                build: {
                    loader: 'file',
                    entryPoint: iconHref,
                },
                finisher(files) {
                    iconElement.attr('href', files[0]);
                },
            },
            ...(await appleIcons),
        ];
    }

    const icons = await generateFavicons(image, FAVICONS);

    return [
        ...icons.map((icon) => /** @type {import('./index.js').CollectResult} */ ({
            build: {
                entryPoint: path.join(options.sourceDir, icon.name),
                contents: icon.contents,
                loader: 'file',
            },
            async finisher(files) {
                if (icon.size === 196) {
                    const link = $('<link>');
                    link.attr('rel', 'shortcut icon');
                    link.attr('href', files[0]);
                    link.insertBefore(iconElement);
                }

                const link = $('<link>');
                link.attr('rel', 'icon');
                link.attr('sizes', `${icon.size}x${icon.size}`);
                link.attr('href', files[0]);
                link.insertBefore(iconElement);
            },
        })),
        ...(await appleIcons),
        {
            finisher() {
                iconElement.remove();
            },
        },
    ];
}
