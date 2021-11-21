import path from 'path';
import { isRelativeUrl } from '@chialab/node-resolve';
import Jimp, { SUPPORTED_MIME_TYPES } from './generator.js';

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

const APPLE_LAUNCH_SCREENS = [
    {
        name: 'apple-launch-iphonex.png',
        width: 1125,
        height: 2436,
        query: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
    },
    {
        name: 'apple-launch-iphone8.png',
        width: 750,
        height: 1334,
        query: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
    },
    {
        name: 'apple-launch-iphone8-plus.png',
        width: 1242,
        height: 2208,
        query: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)',
    },
    {
        name: 'apple-launch-iphone5.png',
        width: 640,
        height: 1136,
        query: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
    },
    {
        name: 'apple-launch-ipadair.png',
        width: 1536,
        height: 2048,
        query: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)',
    },
    {
        name: 'apple-launch-ipadpro10.png',
        width: 1668,
        height: 2224,
        query: '(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)',
    },
    {
        name: 'apple-launch-ipadpro12.png',
        width: 2048,
        height: 2732,
        query: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)',
    },
];

/**
 * @param {import('./generator').Image} image The base icon buffer.
 * @param {typeof FAVICONS} favicons
 */
async function generateFavicons(image, favicons) {
    const { generateIcon } = await import('./generateIcon.js');
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
    const { generateIcon } = await import('./generateIcon.js');
    return Promise.all(
        icons.map(async ({ name, size, gutter, background }) => ({
            name,
            size,
            contents: await generateIcon(image, size, gutter, background),
        }))
    );
}

/**
 * @param {import('./generator').Image} image The base icon buffer.
 * @param {typeof APPLE_LAUNCH_SCREENS} launchScreens
 */
async function generateAppleLaunchScreens(image, launchScreens) {
    const { generateLaunch } = await import('./generateLaunch.js');
    return Promise.all(
        launchScreens.map(async ({ name, width, height, query }) => ({
            name,
            width,
            height,
            query,
            contents: await generateLaunch(image, width, height, 0, { r: 255, g: 255, b: 255, a: 1 }),
        }))
    );
}

/**
 * Collect and bundle favicons.
 * @type {import('./index').Collector}
 */
export async function collectIcons($, dom, options, { resolve, load }) {
    const iconElement = dom.find('link[rel*="icon"]');
    const iconHref = iconElement.attr('href') || '';
    if (!isRelativeUrl(iconHref)) {
        return [];
    }

    const iconRel = (iconElement.attr('rel') || '').split(' ');
    const mimeType = iconElement.attr('type') || 'image/png';
    if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
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
    const image = await Jimp.read(imageBuffer);
    const [
        favicons,
        appleIcons,
        appleLaunchScreens,
    ] = await Promise.all([
        generateFavicons(image, FAVICONS),
        generateAppleIcons(image, APPLE_ICONS),
        iconRel.includes('apple-touch-startup-image') ? generateAppleLaunchScreens(image, APPLE_LAUNCH_SCREENS) : [],
    ]);

    return [
        ...favicons.map((icon) => /** @type {import('./index.js').Build} */ ({
            loader: 'file',
            options: {
                entryPoint: icon.name,
                contents: icon.contents,
            },
            async finisher(outputFiles) {
                const file = outputFiles[0];
                if (icon.size === 196) {
                    const link = $('<link>');
                    link.attr('rel', 'shortcut icon');
                    link.attr('href', path.relative(options.outDir, file.path));
                    link.insertBefore($(iconElement));
                }

                const link = $('<link>');
                link.attr('rel', 'icon');
                link.attr('sizes', `${icon.size}x${icon.size}`);
                link.attr('href', path.relative(options.outDir, file.path));
                link.insertBefore($(iconElement));
            },
        })),
        ...appleIcons.map((icon) => /** @type {import('./index.js').Build} */ ({
            loader: 'file',
            options: {
                entryPoint: icon.name,
                contents: icon.contents,
                outdir: 'icons',
            },
            async finisher(outputFiles) {
                const file = outputFiles[0];
                const link = $('<link>');
                link.attr('rel', 'apple-touch-icon');
                link.attr('sizes', `${icon.size}x${icon.size}`);
                link.attr('href', path.relative(options.outDir, file.path));
                link.insertBefore($(iconElement));
            },
        })),
        ...appleLaunchScreens.map((icon) => /** @type {import('./index.js').Build} */ ({
            loader: 'file',
            options: {
                entryPoint: icon.name,
                contents: icon.contents,
                outdir: 'icons',
            },
            async finisher(outputFiles) {
                const file = outputFiles[0];
                const link = $('<link>');
                link.attr('rel', 'apple-touch-startup-image');
                link.attr('media', icon.query);
                link.attr('href', path.relative(options.outDir, file.path));
                link.insertBefore($(iconElement));
            },
        })),
        {
            finisher() {
                $(iconElement).remove();
            },
        },
    ];
}
