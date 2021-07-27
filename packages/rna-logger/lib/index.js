import debug from 'debug';

export function createLogger(name = 'rna') {
    const logger = debug(name);

    return {
        /**
         * @param  {any[]} messages
         */
        log(...messages) {
            // eslint-disable-next-line no-console
            console.log(...messages);
        },
        /**
         * @param  {any[]} messages
         */
        debug(...messages) {
            logger('%s', ...messages);
        },
        /**
         * @param  {any[]} messages
         */
        error(...messages) {
            // eslint-disable-next-line no-console
            console.error(...messages);
        },
        /**
         * @param  {any[]} messages
         */
        warn(...messages) {
            // eslint-disable-next-line no-console
            console.warn(...messages);
        },
        group() {
            // eslint-disable-next-line no-console
            console.group();
        },
        groupEnd() {
            // eslint-disable-next-line no-console
            console.groupEnd();
        },
        /**
         * @param {import('@web/dev-server-core').ErrorWithLocation} error
         */
        logSyntaxError(error) {
            // eslint-disable-next-line no-console
            console.error(error);
        },
    };
}

/**
 * @typedef {ReturnType<createLogger>} Logger
 */

/**
 * Convert a number of bytes to human-readable text.
 *
 * @param {number} byteSize
 * @return {string}
 */
export function toReadableSize(byteSize) {
    if (byteSize === undefined || byteSize < 0) {
        return 'invalid size';
    }
    if (byteSize === 0) {
        return '0 B';
    }

    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
    const log2 = Math.log2(byteSize);
    const unitIdx = Math.floor(log2 / 10);
    const normalizedSize = byteSize / (1 << (unitIdx * 10));

    return `${normalizedSize.toFixed(2)} ${units[unitIdx]}`;
}
