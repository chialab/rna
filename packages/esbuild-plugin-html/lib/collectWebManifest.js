import { promises } from 'fs';
import path from 'path';
import $ from 'cheerio';
import { generateIcon } from './generateIcon.js';

const { readFile, writeFile, mkdir } = promises;

/**
 * Collect and bundle webmanifests.
 * @param {$.Cheerio} dom The DOM element.
 * @param {string} base The base dir.
 * @param {string} outdir The output dir.
 * @return {import('./index').Entrypoint[]} A list of entrypoints.
 */
export function collectWebManifest(dom, base, outdir) {
    let htmlElement = dom.find('html');
    let baseElement = dom.find('base');
    let titleElement = dom.find('title');
    let descriptionElement = dom.find('meta[name="description"]');
    let themeElement = dom.find('meta[name="theme"]');
    let iconElement = dom.find('link[rel*="icon"]');
    let element = dom
        .find('link[rel="manifest"]')
        .get()
        .filter((element) => $(element).attr('href'))[0];
    if (!element) {
        return [];
    }

    let entryPoint = path.resolve(base, /** @type {string} */($(element).attr('href')));
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
            async finisher(filePath) {
                let contents = await readFile(filePath, 'utf-8');
                let json = JSON.parse(contents);
                json.name = json.name || titleElement.text() || undefined;
                json.short_name = json.short_name || json.name || titleElement.text() || undefined;
                json.description = json.description || descriptionElement.attr('content') || undefined;
                json.start_url = json.start_url || baseElement.attr('href') || '/';
                json.scope = json.scope || baseElement.attr('href') || '';
                json.display = json.display || 'standalone';
                json.orientation = json.orientation || 'any';
                json.theme_color = json.theme_color || themeElement.attr('content') || undefined;
                json.background_color = json.background_color || '#fff';
                json.lang = json.lang || htmlElement.attr('lang') || 'en-US';

                let iconHref = iconElement.attr('href');
                if (iconHref) {
                    let iconsDir = path.join(outdir, 'icons');
                    try {
                        await mkdir(iconsDir);
                    } catch (err) {
                        //
                    }
                    let iconFile = path.resolve(base, iconHref);
                    json.icons = await Promise.all(
                        [
                            {
                                name: 'android-chrome-36x36.png',
                                size: 36,
                            },
                            {
                                name: 'android-chrome-48x48.png',
                                size: 48,
                            },
                            {
                                name: 'android-chrome-72x72.png',
                                size: 72,
                            },
                            {
                                name: 'android-chrome-96x96.png',
                                size: 96,
                            },
                            {
                                name: 'android-chrome-144x144.png',
                                size: 144,
                            },
                            {
                                name: 'android-chrome-192x192.png',
                                size: 192,
                            },
                            {
                                name: 'android-chrome-256x256.png',
                                size: 256,
                            },
                            {
                                name: 'android-chrome-384x384.png',
                                size: 384,
                            },
                            {
                                name: 'android-chrome-512x512.png',
                                size: 512,
                            },
                        ].map(async ({ name, size }) => {
                            let outputFile = path.join(iconsDir, name);
                            let buffer = await generateIcon(iconFile, size, 0, { r: 255, g: 255, b: 255, a: 1 }, iconElement.attr('type') || 'image/png');
                            await writeFile(outputFile, buffer);
                            return {
                                src: path.relative(outdir, outputFile),
                                sizes: `${size}x${size}`,
                                type: 'image/png',
                            };
                        })
                    );
                }

                await writeFile(filePath, JSON.stringify(json, null, 4));
                $(element).attr('href', path.relative(outdir, filePath));
            },
        },
    ];
}
