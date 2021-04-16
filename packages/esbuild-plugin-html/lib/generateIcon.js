export const SUPPORTED_MIME_TYPES = [
    'image/png',
    'image/jpeg',
];

/**
 * Generate icon image buffer.
 * @param {string} fileName The base icon file.
 * @param {number} size The icon size.
 * @param {number} gutter The gutter size.
 * @param {import('@jimp/core').RGBA} background The background color to use.
 * @param {string} [mime] The mimetype.
 * @return Icon buffer.
 */
export async function generateIcon(fileName, size, gutter, background, mime = 'image/png') {
    const { default: Jimp } = await import('jimp');
    let image = await Jimp.read(fileName);
    let gutterAlpha = image.hasAlpha() ? (gutter || 0) : 0;
    let backgroundColor = image.hasAlpha() ? { r: 255, g: 255, b: 255, a: 0 } : background;
    let color = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`;
    let iconBuffer = new Jimp(size, size, color);
    iconBuffer.composite(image.resize(size - (gutterAlpha || 0), size - (gutterAlpha || 0)), (gutterAlpha || 0) / 2, (gutterAlpha || 0) / 2);
    return iconBuffer.getBufferAsync(mime);
}
