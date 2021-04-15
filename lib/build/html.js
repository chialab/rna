import path from 'path';
import { promises } from 'fs';
import esbuildModule from 'esbuild';
import $ from 'cheerio';

const { readFile, writeFile, unlink, mkdir } = promises;

/**
 * @typedef {Object} Entrypoint
 * @property {import('esbuild').Loader} loader The loader to use.
 * @property {Partial<import('esbuild').BuildOptions>} options The file name of the referenced file.
 * @property {(filePath: string) => Promise<void>|void} finisher A callback function to invoke when output file has been generated.
 */

/**
 * Convert color to CSS rgba string.
 * @param {import('@jimp/core').RGBA} color The color to convert.
 * @return {string}
 */
function colorToString({ r, g, b, a }) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Generate icon buffer.
 * @param {string} fileName The base icon file.
 * @param {number} size The icon size.
 * @param {number} gutter The gutter size.
 * @param {import('@jimp/core').RGBA} background The background color to use.
 * @param {string} [mime] The mimetype.
 * @return Icon buffer.
 */
async function generateIcon(fileName, size, gutter, background, mime = 'image/png') {
    const { default: Jimp } = await import('jimp');
    let image = await Jimp.read(fileName);
    let gutterAlpha = image.hasAlpha() ? (gutter || 0) : 0;
    let iconBuffer = new Jimp(size, size, colorToString(image.hasAlpha() ? { r: 255, g: 255, b: 255, a: 0 } : background));
    iconBuffer.composite(image.resize(size - (gutterAlpha || 0), size - (gutterAlpha || 0)), (gutterAlpha || 0) / 2, (gutterAlpha || 0) / 2);
    return iconBuffer.getBufferAsync(mime);
}

/**
 * Generate splashscreen buffer.
 * @param {string} fileName The base icon file.
 * @param {number} width The icon size.
 * @param {number} height The icon size.
 * @param {number} gutter The gutter size.
 * @param {import('@jimp/core').RGBA} background The background color to use.
 * @param {string} [mime] The mimetype.
 * @return Icon buffer.
 */
async function generateSplash(fileName, width, height, gutter, background, mime = 'image/png') {
    const { default: Jimp } = await import('jimp');
    let image = await Jimp.read(fileName);
    let gutterAlpha = image.hasAlpha() ? (gutter || 0) : 0;
    let splashBackground = (() => {
        if (image.hasAlpha()) {
            return null;
        }
        let topLeftColor = image.getPixelColor(0, 0);
        let topRightColor = image.getPixelColor(image.bitmap.width - 1, 0);
        let bottomLeftColor = image.getPixelColor(0, image.bitmap.height - 1);
        let bottomRightColor = image.getPixelColor(image.bitmap.width - 1, image.bitmap.height - 1);
        if (topLeftColor === topRightColor &&
            topLeftColor === bottomLeftColor &&
            topLeftColor === bottomRightColor) {
            let color = Jimp.intToRGBA(topLeftColor);
            color.a = 1;
            return color;
        }
        return null;
    })() || background;
    let size = Math.round(Math.min(height / 6, width / 6)) - (gutterAlpha || 0);
    let splashBuffer = new Jimp(width, height, colorToString(splashBackground));
    splashBuffer.composite(image.resize(size, size), (width - size) / 2, (height - size) / 2);
    return splashBuffer.getBufferAsync(mime);
}

/**
 * Collect and bundle each <link> reference.
 * @param {$.Cheerio} dom The DOM element.
 * @param {string} base The base dir.
 * @param {string} outdir The output dir.
 * @return {Entrypoint[]} A list of entrypoints.
 */
function handleStyles(dom, base, outdir) {
    return [
        ...dom
            .find('link[href][rel="stylesheet"]')
            .get()
            .filter((element) => $(element).attr('href'))
            .map((element) => /** @type {Entrypoint} */({
                loader: 'css',
                options: {
                    entryPoints: [
                        path.resolve(base, /** @type {string} */ ($(element).attr('href'))),
                    ],
                    entryNames: 'css/[name]-[hash]',
                    chunkNames: 'css/[name]-[hash]',
                    assetNames: 'css/assets/[name]-[hash]',
                },
                finisher(filePath) {
                    $(element).attr('href', path.relative(outdir, filePath));
                },
            })),
        ...dom
            .find('style')
            .get()
            .map((element) => {
                let code = /** @type {string} */ ($(element).html() || '');
                /** @type {Entrypoint} */
                let entrypoint = {
                    loader: 'css',
                    options: {
                        entryPoints: undefined,
                        stdin: {
                            contents: code,
                            loader: 'css',
                            resolveDir: base,
                            sourcefile: path.join(base, 'inline.css'),
                        },
                        entryNames: 'css/[name]-[hash]',
                        chunkNames: 'css/[name]-[hash]',
                        assetNames: 'css/assets/[name]-[hash]',
                    },
                    finisher(filePath) {
                        $(element).text(`@import url('${path.relative(outdir, filePath)}');`);
                    },
                };
                return entrypoint;
            }),
    ];
}

/**
 * Collect and bundle each <script> reference.
 * @param {$.Cheerio} dom The DOM element.
 * @param {string} base The base dir.
 * @param {string} outdir The output dir.
 * @return {Entrypoint[]} A list of entrypoints.
 */
function handleScripts(dom, base, outdir) {
    return [
        ...dom.find('script[src][type="module"]')
            .get()
            .filter((element) => $(element).attr('src'))
            .map((element) => /** @type {Entrypoint} */ ({
                options: {
                    entryPoints: [
                        path.resolve(base, /** @type {string} */ ($(element).attr('src'))),
                    ],
                    format: 'esm',
                    entryNames: 'esm/[name]-[hash]',
                    chunkNames: 'esm/[name]-[hash]',
                    assetNames: 'esm/assets/[name]-[hash]',
                },
                finisher(filePath) {
                    $(element).attr('src', path.relative(outdir, filePath));
                },
            })),
        ...dom.find('script[type="module"]:not([src])')
            .get()
            .map((element) => {
                let code = /** @type {string} */ ($(element).html() || '');
                $(element).html('');
                /** @type {Entrypoint} */
                let entrypoint = {
                    loader: 'tsx',
                    options: {
                        entryPoints: undefined,
                        stdin: {
                            contents: code,
                            loader: 'tsx',
                            resolveDir: base,
                            sourcefile: path.join(base, 'inline.tsx'),
                        },
                        format: 'esm',
                        entryNames: 'esm/[name]-[hash]',
                        chunkNames: 'esm/[name]-[hash]',
                        assetNames: 'esm/assets/[name]-[hash]',
                    },
                    finisher(filePath) {
                        $(element).attr('src', path.relative(outdir, filePath));
                    },
                };
                return entrypoint;
            }),
        ...dom.find('script[src]:not([type]), script[src][type="text/javascript"], script[src][type="application/javascript"]')
            .get()
            .filter((element) => $(element).attr('src'))
            .map((element) => /** @type {Entrypoint} */ ({
                options: {
                    entryPoints: [
                        path.resolve(base, /** @type {string} */ ($(element).attr('src'))),
                    ],
                    format: 'iife',
                    entryNames: 'iife/[name]-[hash]',
                    chunkNames: 'iife/[name]-[hash]',
                    assetNames: 'iife/assets/[name]-[hash]',
                    splitting: false,
                },
                finisher(filePath) {
                    $(element).attr('src', path.relative(outdir, filePath));
                },
            })),
        ...dom.find('script:not([src]):not([type]), script[type="text/javascript"]:not([src]), script[type="application/javascript"]:not([src])')
            .get()
            .map((element) => {
                let code = /** @type {string} */ ($(element).html() || '');
                $(element).html('');
                /** @type {Entrypoint} */
                let entrypoint = {
                    loader: 'tsx',
                    options: {
                        entryPoints: undefined,
                        stdin: {
                            contents: code,
                            loader: 'tsx',
                            resolveDir: base,
                            sourcefile: path.join(base, 'inline.tsx'),
                        },
                        format: 'iife',
                        globalName: undefined,
                        entryNames: 'iife/[name]-[hash]',
                        chunkNames: 'iife/[name]-[hash]',
                        assetNames: 'iife/assets/[name]-[hash]',
                        splitting: false,
                    },
                    finisher(filePath) {
                        $(element).attr('src', path.relative(outdir, filePath));
                    },
                };
                return entrypoint;
            }),
    ];
}

/**
 * Collect and bundle each node with a src reference.
 * @param {$.Cheerio} dom The DOM element.
 * @param {string} base The base dir.
 * @param {string} outdir The output dir.
 * @return {Entrypoint[]} A list of entrypoints.
 */
function handleAssets(dom, base, outdir) {
    return [
        ...dom
            .find('[src]:not(script)')
            .get()
            .filter((element) => $(element).attr('src'))
            .map((element) => /** @type {Entrypoint} */ ({
                loader: 'file',
                options: {
                    entryPoints: [
                        path.resolve(base, /** @type {string} */ ($(element).attr('src'))),
                    ],
                    entryNames: 'assets/[name]-[hash]',
                    chunkNames: 'assets/[name]-[hash]',
                    assetNames: 'assets/[name]-[hash]',
                },
                finisher(filePath) {
                    $(element).attr('src', path.relative(outdir, filePath));
                },
            })),
        ...dom
            .find('link[href]:not([rel="stylesheet"]):not([rel="manifest"]):not([rel*="icon"]), a[download][href], iframe[href]')
            .get()
            .filter((element) => $(element).attr('href'))
            .map((element) => /** @type {Entrypoint} */ ({
                loader: 'file',
                options: {
                    entryPoints: [
                        path.resolve(base, /** @type {string} */ ($(element).attr('href'))),
                    ],
                    entryNames: 'assets/[name]-[hash]',
                    chunkNames: 'assets/[name]-[hash]',
                    assetNames: 'assets/[name]-[hash]',
                },
                finisher(filePath) {
                    $(element).attr('href', path.relative(outdir, filePath));
                },
            })),
    ];
}

/**
 * Collect and bundle webmanifests.
 * @param {$.Cheerio} dom The DOM element.
 * @param {string} base The base dir.
 * @param {string} outdir The output dir.
 * @return {Entrypoint[]} A list of entrypoints.
 */
function handleWebManifest(dom, base, outdir) {
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

/**
 * Collect and bundle webmanifests.
 * @param {$.Cheerio} dom The DOM element.
 * @param {string} base The base dir.
 * @param {string} outdir The output dir.
 * @return {Entrypoint[]} A list of entrypoints.
 */
function handleIcon(dom, base, outdir) {
    let iconElement = dom.find('link[rel*="icon"]');
    let element = dom
        .find('link[rel*="icon"]')
        .get()
        .filter((element) => $(element).attr('href'))[0];
    if (!element) {
        return [];
    }

    let iconHref = iconElement.attr('href') || '';
    if (!iconHref) {
        return [];
    }

    let entryPoint = path.resolve(base, iconHref);

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
                let iconsDir = path.join(outdir, 'icons');
                try {
                    await mkdir(iconsDir);
                } catch (err) {
                    //
                }

                let iconFile = path.resolve(base, iconHref);
                let favIcons = [
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
                for (let i = 0; i < favIcons.length; i++) {
                    let { name, size } = favIcons[i];
                    let outputFile = path.join(iconsDir, name);
                    let buffer = await generateIcon(iconFile, size, 0, { r: 255, g: 255, b: 255, a: 1 }, iconElement.attr('type') || 'image/png');
                    await writeFile(outputFile, buffer);
                    if (size === 196) {
                        let link = $('<link>');
                        link.attr('rel', 'shortcut icon');
                        link.attr('href', path.relative(outdir, outputFile));
                        link.insertBefore($(element));
                        $(element).before('\n    ');
                    }

                    let link = $('<link>');
                    link.attr('rel', 'icon');
                    link.attr('sizes', `${size}x${size}`);
                    link.attr('href', path.relative(outdir, outputFile));
                    link.insertBefore($(element));
                    $(element).before('\n    ');
                }

                let appleIcons = [
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
                for (let i = 0; i < appleIcons.length; i++) {
                    let { name, size, gutter, background } = appleIcons[i];
                    let outputFile = path.join(iconsDir, name);
                    let buffer = await generateIcon(iconFile, size, gutter, background, iconElement.attr('type') || 'image/png');
                    await writeFile(outputFile, buffer);
                    let link = $('<link>');
                    link.attr('rel', 'apple-touch-icon');
                    link.attr('sizes', `${size}x${size}`);
                    link.attr('href', path.relative(outdir, outputFile));
                    link.insertBefore($(element));
                    $(element).before('\n    ');
                }

                let launchScreens = [
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
                for (let i = 0; i < launchScreens.length; i++) {
                    let { name, query, width, height } = launchScreens[i];
                    let outputFile = path.join(iconsDir, name);
                    let buffer = await generateSplash(iconFile, width, height, 0, { r: 255, g: 255, b: 255, a: 1 }, iconElement.attr('type') || 'image/png');
                    await writeFile(outputFile, buffer);
                    let link = $('<link>');
                    link.attr('rel', 'apple-touch-startup-image');
                    link.attr('media', query);
                    link.attr('href', path.relative(outdir, outputFile));
                    link.insertBefore($(element));
                    if (i !== launchScreens.length - 1) {
                        $(element).before('\n    ');
                    }
                }

                $(element).remove();
            },
        },
    ];
}

/**
 * @return An esbuild plugin.
 */
export function htmlPlugin({ esbuild = esbuildModule } = {}) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'html',
        setup(build) {
            let options = build.initialOptions;

            build.onLoad({ filter: /\.html$/ }, async ({ path: filePath }) => {
                let contents = await readFile(filePath, 'utf-8');
                let basePath = path.dirname(filePath);
                let outdir = options.outdir || (options.outfile && path.dirname(options.outfile)) || process.cwd();
                let dom = $.load(contents);
                let root = dom.root();
                let entrypoints = [
                    ...handleIcon(root, basePath, outdir),
                    ...handleWebManifest(root, basePath, outdir),
                    ...handleStyles(root, basePath, outdir),
                    ...handleScripts(root, basePath, outdir),
                    ...handleAssets(root, basePath, outdir),
                ];

                for (let i = 0; i < entrypoints.length; i++) {
                    let entrypoint = entrypoints[i];
                    /** @type {import('esbuild').BuildOptions} */
                    let config = {
                        ...options,
                        outfile: undefined,
                        outdir,
                        metafile: true,
                        ...entrypoint.options,
                    };
                    let result = await esbuild.build(config);
                    if (!result.metafile) {
                        return;
                    }

                    let outputs = Object.keys(result.metafile.outputs);
                    await entrypoint.finisher(outputs[0]);

                    if (entrypoint.loader === 'file') {
                        await Promise.all(
                            outputs.slice(1).map((fileName) => unlink(fileName))
                        );
                    }
                }

                return {
                    contents: dom.html(),
                    loader: 'file',
                };
            });
        },
    };

    return plugin;
}
