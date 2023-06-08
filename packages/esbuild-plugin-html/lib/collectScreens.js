import path from 'path';
import { isRelativeUrl } from '@chialab/node-resolve';
import Jimp from './generator.js';
import { generateLaunch } from './generateLaunch.js';
import { collectAsset } from './collectAssets.js';

/**
 * @typedef {Object} Screen
 * @property {string} name The screen name.
 * @property {Buffer} contents The icon buffer.
 * @property {number} width The screen width.
 * @property {number} height The screen height.
 * @property {string} query The screen media query.
 */

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
 * @param {typeof APPLE_LAUNCH_SCREENS} launchScreens
 * @returns {Promise<Screen[]>}
 */
async function generateAppleLaunchScreens(image, launchScreens) {
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
 * @param {import('cheerio').CheerioAPI} $ The cheerio selector.
 * @param {import('cheerio').Cheerio<import('cheerio').Element>} element The DOM element.
 * @param {Screen} screen The generated screen file.
 * @param {import('./index.js').BuildOptions} options Build options.
 * @param {import('./index.js').Helpers} helpers Helpers.
 * @returns {Promise<import('@chialab/esbuild-rna').OnTransformResult>} Plain build.
 */
export async function collectScreen($, element, screen, options, helpers) {
    const entryPoint = path.join(options.sourceDir, screen.name);
    const file = await helpers.emitFile(entryPoint, screen.contents);
    const outputPath = helpers.resolveRelativePath(file.path, null, '');

    const link = $('<link>');
    link.attr('rel', 'apple-touch-startup-image');
    link.attr('media', screen.query);
    link.attr('href', outputPath);
    link.insertBefore(element);

    return {
        ...file,
        watchFiles: [entryPoint],
    };
}

/**
 * Collect and bundle apple screens.
 * @type {import('./index').Collector}
 */
export async function collectScreens($, dom, options, helpers) {
    const splashElement = dom.find('link[rel*="apple-touch-startup-image"]').last();
    const splashHref = splashElement.attr('href') || '';
    if (!isRelativeUrl(splashHref)) {
        return [];
    }

    const splashFilePath = await helpers.resolve(splashHref);
    if (!splashFilePath.path) {
        throw new Error(`Failed to resolve icon path: ${splashHref}`);
    }

    const splashFile = await helpers.load(splashFilePath.path, splashFilePath);
    if (!splashFile || !splashFile.contents) {
        throw new Error(`Failed to load icon file: ${splashFilePath.path}`);
    }

    const imageBuffer = Buffer.from(splashFile.contents);

    try {
        const image = await Jimp.read(imageBuffer);
        const appleLaunchScreens = await generateAppleLaunchScreens(image, APPLE_LAUNCH_SCREENS);
        const results = await Promise.all(appleLaunchScreens.map((icon) => collectScreen($, splashElement, icon, options, helpers)));
        splashElement.remove();

        return results;
    } catch (err) {
        const result = await collectAsset($, splashElement, 'href', options, helpers);
        if (result) {
            return [result];
        }

        return [];
    }
}
