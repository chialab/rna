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
 * Collect and bundle favicons.
 * @type {import('./index').Collector}
 */
export async function collectIcons($, dom, options, { resolve, load }) {
    const iconElement = dom.find('link[rel*="icon"]').last();
    const iconHref = iconElement.attr('href') || '';
    if (!isRelativeUrl(iconHref)) {
        return [];
    }

    const mimeType = iconElement.attr('type') || 'image/png';
    if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
        return [
            {
                build: {
                    loader: 'file',
                    entryPoint: iconHref,
                },
                finisher(outputFiles) {
                    iconElement.attr('href', path.relative(options.outDir, outputFiles[0].path));
                },
            },
        ];
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
    ] = await Promise.all([
        generateFavicons(image, FAVICONS),
        generateAppleIcons(image, APPLE_ICONS),
    ]);

    return [
        ...favicons.map((icon) => /** @type {import('./index.js').CollectResult} */ ({
            build: {
                entryPoint: icon.name,
                contents: icon.contents,
                loader: 'file',
            },
            async finisher(outputFiles) {
                const file = outputFiles[0];
                if (icon.size === 196) {
                    const link = $('<link>');
                    link.attr('rel', 'shortcut icon');
                    link.attr('href', path.relative(options.outDir, file.path));
                    link.insertBefore(iconElement);
                }

                const link = $('<link>');
                link.attr('rel', 'icon');
                link.attr('sizes', `${icon.size}x${icon.size}`);
                link.attr('href', path.relative(options.outDir, file.path));
                link.insertBefore(iconElement);
            },
        })),
        ...appleIcons.map((icon) => /** @type {import('./index.js').CollectResult} */ ({
            build: {
                entryPoint: icon.name,
                contents: icon.contents,
                loader: 'file',
                outdir: 'icons',
            },
            async finisher(outputFiles) {
                const file = outputFiles[0];
                const link = $('<link>');
                link.attr('rel', 'apple-touch-icon');
                link.attr('sizes', `${icon.size}x${icon.size}`);
                link.attr('href', path.relative(options.outDir, file.path));
                link.insertBefore(iconElement);
            },
        })),
        {
            finisher() {
                iconElement.remove();
            },
        },
    ];
}
