import { isAbsolute } from 'node:path';

/**
 * Check if the given source is a relative url.
 * @param {string | null | undefined} url The source to check.
 */
export function isRelativeUrl(url) {
    if (!url) {
        return false;
    }
    if (isAbsolute(url)) {
        return false;
    }
    try {
        new URL(url);
        return false;
    } catch {
        return true;
    }
}
