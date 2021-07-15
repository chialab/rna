import debug from 'debug';

const logger = debug('rna dev server');

export function createLogger() {
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
