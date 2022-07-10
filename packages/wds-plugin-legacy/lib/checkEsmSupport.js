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
     * @param {import('koa').Context} context
     */
    const match = (context) => {
        const ua = context.get('user-agent');
        if (ua in cache) {
            return cache[ua];
        }
        return cache[ua] = matchesUA(ua, { browsers: ESM_BROWSERS });
    };

    return match;
};

export const checkEsmSupport = memoMatchUserAgent();
