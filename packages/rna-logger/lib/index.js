import debug from 'debug';
import chalk from 'chalk';

export const colors = chalk;

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
        /**
         * @param {*} tabularData
         * @param {string[]} [properties]
         */
        table(tabularData, properties) {
            // eslint-disable-next-line no-console
            console.table(tabularData, properties);
        },
        /**
         * @param {{ [key: string]: * }} files
         * @param {string[]} properties
         * @param {{ [key: string]: (input: *) => string }} formatters
         */
        files(files, properties = [], formatters = {}) {
            /**
             * @param {string} key
             * @param {*} value
             */
            const format = (key, value) => (formatters[key] ? formatters[key](value) : `${value}`);

            const columns = Object.keys(files)
                .reduce((acc, key) => {
                    const fileColumn = acc.filename = acc.filename || {
                        values: [],
                        length: 0,
                    };
                    fileColumn.values.push(key);
                    fileColumn.length = Math.max(fileColumn.length || 0, key.length);

                    const file = files[key];
                    properties.forEach((propKey) => {
                        const realValue = file[propKey];
                        const propValue = format(propKey, realValue);
                        const propColumn = acc[propKey] = acc[propKey] || {
                            values: [],
                            length: 0,
                            total: 0,
                        };

                        if (typeof realValue === 'number') {
                            propColumn.total += realValue;
                            propColumn.length = Math.max(propColumn.length || 0, format(propKey, propColumn.total).length);
                        }

                        propColumn.values.push(propValue);
                        propColumn.length = Math.max(propColumn.length || 0, propValue.length);
                    });

                    return acc;
                }, /** @type {*} */({}));

            this.log(Object.keys(columns).map((name) => colors.white.bold(name[0].toUpperCase() + name.substr(1).padEnd(columns[name].length - 1, ' '))).join('\t'));

            const fileNames = Object.keys(files);
            fileNames.forEach((fileName, index) => {
                this.log(Object.keys(columns).map((name, colIndex) => (colIndex === 0 ? colors.blue : colors.gray)((columns[name].values[index] || '').padEnd(columns[name].length, ' '))).join('\t'));
            });

            if (fileNames.length > 1) {
                const hasTotal = Object.keys(columns).some((name) => columns[name].total);
                if (hasTotal) {
                    this.log(Object.keys(columns).map((name) => ''.padEnd(columns[name].length, columns[name].total ? '—' : ' ')).join('\t'));
                    this.log(Object.keys(columns).map((name) => colors.yellow.bold((columns[name].total ? format(name, columns[name].total) : '').padEnd(columns[name].length, ' '))).join('\t'));
                }
            }
            this.log();
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
export function readableSize(byteSize) {
    if (byteSize === undefined) {
        return '-';
    }
    if (byteSize < 0) {
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
