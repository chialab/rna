import path from 'path';
import { isRelativeUrl } from '@chialab/node-resolve';
import Jimp from './generator.js';
import { generateLaunch } from './generateLaunch.js';

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
 * Collect and bundle apple screens.
 * @type {import('./index').Collector}
 */
export async function collectScreens($, dom, options, { resolve, load }) {
    const splashElement = dom.find('link[rel*="apple-touch-startup-image"]').last();
    const splashHref = splashElement.attr('href') || '';
    if (!isRelativeUrl(splashHref)) {
        return [];
    }

    const splashFilePath = await resolve(splashHref);
    if (!splashFilePath.path) {
        throw new Error(`Failed to resolve icon path: ${splashHref}`);
    }

    const splashFile = await load(splashFilePath.path, splashFilePath);
    if (!splashFile.contents) {
        throw new Error(`Failed to load icon file: ${splashFilePath.path}`);
    }

    const imageBuffer = Buffer.from(splashFile.contents);

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
                    entryPoint: splashHref,
                },
                finisher(files) {
                    splashElement.attr('href', files[0]);
                },
            },
        ];
    }

    const appleLaunchScreens = await generateAppleLaunchScreens(image, APPLE_LAUNCH_SCREENS);

    return [
        ...appleLaunchScreens.map((icon) => /** @type {import('./index.js').CollectResult} */ ({
            build: {
                entryPoint: path.join(options.sourceDir, icon.name),
                contents: icon.contents,
                loader: 'file',
                outdir: 'icons',
            },
            async finisher(files) {
                const link = $('<link>');
                link.attr('rel', 'apple-touch-startup-image');
                link.attr('media', icon.query);
                link.attr('href', files[0]);
                link.insertBefore(splashElement);
            },
        })),
        {
            finisher() {
                splashElement.remove();
            },
        },
    ];
}
