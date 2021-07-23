import { promises } from 'fs';
import path from 'path';

const { readFile, writeFile, mkdir } = promises;

/**
 * @param {string} filePath
 */
async function load(filePath, fallback = {}) {
    try {
        const contents = await readFile(filePath, 'utf-8');
        return JSON.parse(contents);
    } catch {
        return fallback;
    }
}

/**
 * Collect and bundle webmanifests.
 * @param {import('cheerio').CheerioAPI} $ The cheerio selector.
 * @param {import('cheerio').Cheerio<import('cheerio').Document>} dom The DOM element.
 * @param {string} base The base dir.
 * @param {string} outdir The output dir.
 * @return {import('./index').Entrypoint[]} A list of entrypoints.
 */
export function collectWebManifest($, dom, base, outdir) {
    const htmlElement = dom.find('html');
    const baseElement = dom.find('base');
    const titleElement = dom.find('title');
    const descriptionElement = dom.find('meta[name="description"]');
    const themeElement = dom.find('meta[name="theme"]');
    const iconElement = dom.find('link[rel*="icon"]');
    const element = dom.find('link[rel="manifest"]');
    const href = /** @type {string} */($(element).attr('href'));
    if (!href) {
        return [];
    }

    const entryPoint = path.resolve(base, href);
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
                const json = await load(filePath);
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

                const iconHref = iconElement.attr('href');
                icon: if (iconHref) {
                    const [
                        { default: Jimp, SUPPORTED_MIME_TYPES },
                        { generateIcon },
                    ] = await Promise.all([
                        import('./generator.js'),
                        await import('./generateIcon.js'),
                    ]);

                    const iconsDir = path.join(outdir, 'icons');
                    const mimeType = iconElement.attr('type') || 'image/png';
                    if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
                        break icon;
                    }

                    try {
                        await mkdir(iconsDir);
                    } catch (err) {
                        //
                    }

                    const iconFile = path.resolve(base, iconHref);
                    const image = await Jimp.read(iconFile);
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
                            const outputFile = path.join(iconsDir, name);
                            await generateIcon(image, size, 0, { r: 255, g: 255, b: 255, a: 1 }, outputFile);
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
