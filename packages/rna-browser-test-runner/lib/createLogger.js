import debug from 'debug';

const logger = debug('rna dev server');

export function createLogger() {
    return {
        /**
         * @type {Map<string, import('@web/dev-server-core').ErrorWithLocation[]>}
         */
        loggedSyntaxErrors: new Map(),

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
            const { message, code, filePath, column, line } = error;
            const errors = this.loggedSyntaxErrors.get(filePath);
            if (!errors) {
                this.loggedSyntaxErrors.set(filePath, [error]);
                return;
            }
            if (
                errors.find((err) => err.code === code &&
                    err.message === message &&
                    err.column === column &&
                    err.line === line)
            ) {
                return;
            }
            errors.push(error);
        },

        clearLoggedSyntaxErrors() {
            this.loggedSyntaxErrors = new Map();
        },
    };
}
