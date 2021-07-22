import { promises } from 'fs';
import path from 'path';
import { SUPPORTED_MIME_TYPES, generateIcon } from './generateIcon.js';
import { generateLaunch } from './generateLaunch.js';

const { writeFile, mkdir } = promises;

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
 * @param {string} icon
 * @param {string} mimeType
 * @param {string} outputDir
 * @param {typeof FAVICONS} favicons
 */
function generateFavicons(icon, mimeType, outputDir, favicons) {
    return Promise.all(
        favicons.map(async ({ name, size }) => {
            const outputFile = path.join(outputDir, name);
            const buffer = await generateIcon(icon, size, 0, { r: 255, g: 255, b: 255, a: 1 }, mimeType);
            await writeFile(outputFile, buffer);

            return {
                name,
                size,
                file: outputFile,
            };
        })
    );
}

/**
 * @param {string} icon
 * @param {string} mimeType
 * @param {string} outputDir
 * @param {typeof APPLE_ICONS} icons
 */
function generateAppleIcons(icon, mimeType, outputDir, icons) {
    return Promise.all(
        icons.map(async ({ name, size, gutter, background }) => {
            const outputFile = path.join(outputDir, name);
            const buffer = await generateIcon(icon, size, gutter, background, mimeType);
            await writeFile(outputFile, buffer);
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
 * @param {string} icon
 * @param {string} mimeType
 * @param {string} outputDir
 * @param {typeof APPLE_LAUNCH_SCREENS} launchScreens
 */
function generateAppleLaunchScreens(icon, mimeType, outputDir, launchScreens) {
    return Promise.all(
        launchScreens.map(async ({ name, width, height, query }) => {
            const outputFile = path.join(outputDir, name);
            const buffer = await generateLaunch(icon, width, height, 0, { r: 255, g: 255, b: 255, a: 1 }, mimeType);
            await writeFile(outputFile, buffer);
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
 * @return {import('./index').Entrypoint[]} A list of entrypoints.
 */
export function collectIcons($, dom, base, outdir) {
    const iconElement = dom.find('link[rel*="icon"]');
    const element = dom
        .find('link[rel*="icon"]')
        .get()
        .filter((element) => $(element).attr('href'))[0];
    if (!element) {
        return [];
    }

    const iconHref = iconElement.attr('href') || '';
    if (!iconHref) {
        return [];
    }

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
                const [
                    favicons,
                    appleIcons,
                    appleLaunchScreens,
                ] = await Promise.all([
                    generateFavicons(iconFile, mimeType, iconsDir, FAVICONS),
                    generateAppleIcons(iconFile, mimeType, iconsDir, APPLE_ICONS),
                    generateAppleLaunchScreens(iconFile, mimeType, iconsDir, APPLE_LAUNCH_SCREENS),
                ]);

                favicons.forEach(({ size, file }) => {
                    if (size === 196) {
                        const link = $('<link>');
                        link.attr('rel', 'shortcut icon');
                        link.attr('href', path.relative(outdir, file));
                        link.insertBefore($(element));
                        $(element).before('\n    ');
                    }

                    const link = $('<link>');
                    link.attr('rel', 'icon');
                    link.attr('sizes', `${size}x${size}`);
                    link.attr('href', path.relative(outdir, file));
                    link.insertBefore($(element));
                    $(element).before('\n    ');
                });

                appleIcons.forEach(({ size, file }) => {
                    const link = $('<link>');
                    link.attr('rel', 'apple-touch-icon');
                    link.attr('sizes', `${size}x${size}`);
                    link.attr('href', path.relative(outdir, file));
                    link.insertBefore($(element));
                    $(element).before('\n    ');
                });

                appleLaunchScreens.forEach(({ query, file }, index, arr) => {
                    const link = $('<link>');
                    link.attr('rel', 'apple-touch-startup-image');
                    link.attr('media', query);
                    link.attr('href', path.relative(outdir, file));
                    link.insertBefore($(element));
                    if (index !== arr.length - 1) {
                        $(element).before('\n    ');
                    }
                });

                $(element).remove();
            },
        },
    ];
}
