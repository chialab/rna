import Jimp from './generator.js';

/**
 * Generate icon image buffer.
 * @param {import('./generator').Image} image The base icon buffer.
 * @param {number} size The icon size.
 * @param {number} gutter The gutter size.
 * @param {import('@jimp/core').RGBA} background The background color to use.

 */
export async function generateIcon(image, size, gutter, background) {
    const clone = image.clone();
    const gutterAlpha = clone.hasAlpha() ? gutter || 0 : 0;
    const backgroundColor = clone.hasAlpha() ? { r: 255, g: 255, b: 255, a: 0 } : background;
    const color = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`;
    const iconBuffer = new Jimp(size, size, color);
    iconBuffer.composite(
        clone.resize(size - (gutterAlpha || 0), size - (gutterAlpha || 0), 'bezierInterpolation'),
        (gutterAlpha || 0) / 2,
        (gutterAlpha || 0) / 2
    );
    return iconBuffer.getBufferAsync('image/png');
}
