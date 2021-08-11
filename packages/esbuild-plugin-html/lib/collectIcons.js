import { mkdir } from 'fs/promises';
import path from 'path';
import { isRelativeUrl } from '@chialab/node-resolve';

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
 * @param {string} outputDir
 * @param {typeof FAVICONS} favicons
 */
async function generateFavicons(image, outputDir, favicons) {
    const { generateIcon } = await import('./generateIcon.js');
    return Promise.all(
        favicons.map(async ({ name, size }) => {
            const outputFile = path.join(outputDir, name);
            await generateIcon(image, size, 0, { r: 255, g: 255, b: 255, a: 1 }, outputFile);
            return {
                name,
                size,
                file: outputFile,
            };
        })
    );
}

/**
 * @param {import('./generator').Image} image The base icon buffer.
 * @param {string} outputDir
 * @param {typeof APPLE_ICONS} icons
 */
async function generateAppleIcons(image, outputDir, icons) {
    const { generateIcon } = await import('./generateIcon.js');
    return Promise.all(
        icons.map(async ({ name, size, gutter, background }) => {
            const outputFile = path.join(outputDir, name);
            await generateIcon(image, size, gutter, background, outputFile);
            return {
                name,
                size,
                gutter,
                background,
                file: outputFile,
            };
        })
    );
}

/**
 * @param {import('./generator').Image} image The base icon buffer.
 * @param {string} outputDir
 * @param {typeof APPLE_LAUNCH_SCREENS} launchScreens
 */
async function generateAppleLaunchScreens(image, outputDir, launchScreens) {
    const { generateLaunch } = await import('./generateLaunch.js');
    return Promise.all(
        launchScreens.map(async ({ name, width, height, query }) => {
            const outputFile = path.join(outputDir, name);
            await generateLaunch(image, width, height, 0, { r: 255, g: 255, b: 255, a: 1 }, outputFile);
            return {
                name,
                width,
                height,
                query,
                file: outputFile,
            };
        })
    );
}

/**
 * Collect and bundle favicons.
 * @param {import('cheerio').CheerioAPI} $ The cheerio selector.
 * @param {import('cheerio').Cheerio<import('cheerio').Document>} dom The DOM element.
 * @param {string} base The base dir.
 * @param {string} outdir The output dir.
 * @return {import('./index').Build[]} A list of builds.
 */
export function collectIcons($, dom, base, outdir) {
    const iconElement = dom.find('link[rel*="icon"]');
    const iconHref = iconElement.attr('href') || '';
    if (!isRelativeUrl(iconHref)) {
        return [];
    }

    const iconRel = (iconElement.attr('rel') || '').split(' ');
    const entryPoint = path.resolve(base, iconHref);

    return [
        {
            loader: 'file',
            options: {
                entryPoints: [
                    entryPoint,
                ],
                entryNames: '[name]',
                chunkNames: '[name]',
                assetNames: '[name]',
            },
            async finisher() {
                const { default: Jimp, SUPPORTED_MIME_TYPES } = await import('./generator.js');
                const iconsDir = path.join(outdir, 'icons');
                const mimeType = iconElement.attr('type') || 'image/png';
                if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
                    return;
                }

                try {
                    await mkdir(iconsDir);
                } catch (err) {
                    //
                }

                const iconFile = path.resolve(base, iconHref);
                const image = await Jimp.read(iconFile);
                const [
                    favicons,
                    appleIcons,
                    appleLaunchScreens,
                ] = await Promise.all([
                    generateFavicons(image, iconsDir, FAVICONS),
                    generateAppleIcons(image, iconsDir, APPLE_ICONS),
                    iconRel.includes('apple-touch-startup-image') ? generateAppleLaunchScreens(image, iconsDir, APPLE_LAUNCH_SCREENS) : [],
                ]);

                favicons.forEach(({ size, file }) => {
                    if (size === 196) {
                        const link = $('<link>');
                        link.attr('rel', 'shortcut icon');
                        link.attr('href', path.relative(outdir, file));
                        link.insertBefore($(iconElement));
                        $(iconElement).before('\n    ');
                    }

                    const link = $('<link>');
                    link.attr('rel', 'icon');
                    link.attr('sizes', `${size}x${size}`);
                    link.attr('href', path.relative(outdir, file));
                    link.insertBefore($(iconElement));
                    $(iconElement).before('\n    ');
                });

                appleIcons.forEach(({ size, file }) => {
                    const link = $('<link>');
                    link.attr('rel', 'apple-touch-icon');
                    link.attr('sizes', `${size}x${size}`);
                    link.attr('href', path.relative(outdir, file));
                    link.insertBefore($(iconElement));
                    $(iconElement).before('\n    ');
                });

                appleLaunchScreens.forEach(({ query, file }, index, arr) => {
                    const link = $('<link>');
                    link.attr('rel', 'apple-touch-startup-image');
                    link.attr('media', query);
                    link.attr('href', path.relative(outdir, file));
                    link.insertBefore($(iconElement));
                    if (index !== arr.length - 1) {
                        $(iconElement).before('\n    ');
                    }
                });

                $(iconElement).remove();
            },
        },
    ];
}
