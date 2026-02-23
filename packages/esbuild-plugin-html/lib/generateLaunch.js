import Jimp from './generator.js';

/**
 * Generate launch screen image buffer.
 * @param {import('./generator').Image} image The base icon buffer.
 * @param {number} width The launch screen size.
 * @param {number} height The launch screen size.
 * @param {number} gutter The gutter size.
 * @param {import('@jimp/core').RGBA} background The background color to use.
 * @returns Launch screen buffer.
 */
export async function generateLaunch(image, width, height, gutter, background) {
    const clone = image.clone();

    const gutterAlpha = (clone.hasAlpha() && gutter) || 0;
    const launchBackground =
        (() => {
            if (clone.hasAlpha()) {
                return null;
            }
            const topLeftColor = clone.getPixelColor(0, 0);
            const topRightColor = clone.getPixelColor(clone.bitmap.width - 1, 0);
            const bottomLeftColor = clone.getPixelColor(0, clone.bitmap.height - 1);
            const bottomRightColor = clone.getPixelColor(clone.bitmap.width - 1, clone.bitmap.height - 1);
            if (
                topLeftColor === topRightColor &&
                topLeftColor === bottomLeftColor &&
                topLeftColor === bottomRightColor
            ) {
                const color = Jimp.intToRGBA(topLeftColor);
                color.a = 1;
                return color;
            }
            return null;
        })() || background;
    const size = Math.round(Math.min(height / 6, width / 6)) - (gutterAlpha || 0);
    const color = `rgba(${launchBackground.r}, ${launchBackground.g}, ${launchBackground.b}, ${launchBackground.a})`;
    const launchBuffer = new Jimp(width, height, color);
    launchBuffer.composite(clone.resize(size, size, 'bezierInterpolation'), (width - size) / 2, (height - size) / 2);
    return launchBuffer.getBufferAsync('image/png');
}
