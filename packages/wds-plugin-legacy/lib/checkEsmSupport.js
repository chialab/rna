import { matchesUA } from 'browserslist-useragent';

/**
 * A list of browserslist target with full (static and dynamic) esm import support.
 */
const ESM_BROWSERS = [
    'chrome >= 63',
    'and_chr >= 63',
    'firefox >= 67',
    'edge >= 79',
    'opera >= 50',
    'safari >= 11.1',
    'ios_saf >= 11.3',
];

/**
 * Memoize `matchesUA` results.
 * @returns A function with the same `matchesUA` signature.
 */
const memoMatchUserAgent = () => {
    /**
     * @type {{ [key: string]: boolean }}
     */
    const cache = {};

    /**
     * @type {typeof matchesUA}
     */
    const match = (ua, caps = { browsers: ESM_BROWSERS }) => {
        if (ua in cache) {
            return cache[ua];
        }
        return cache[ua] = matchesUA(ua, caps);
    };

    return match;
};

export const checkEsmSupport = memoMatchUserAgent();
