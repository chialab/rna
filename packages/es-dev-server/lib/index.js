import getPort, { portNumbers } from 'get-port';
import { DevServer, getRequestFilePath } from '@web/dev-server-core';

/**
 * @typedef {import('@web/dev-server-core').Plugin} Plugin
 */

/**
 * @typedef {import('@web/dev-server-core').DevServerCoreConfig} DevServerCoreConfig
 */

/**
 * @typedef {import('@web/dev-server-core').ErrorWithLocation} ErrorWithLocation
 */

export {
    DevServer,
    getPort,
    portNumbers,
    getRequestFilePath
};
