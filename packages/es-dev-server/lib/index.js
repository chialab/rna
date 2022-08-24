import getPort, { portNumbers } from 'get-port';
import { DevServer as CoreDevServer, getRequestFilePath, PluginError, PluginSyntaxError } from '@web/dev-server-core';
import { mergePluginHooks } from './utils.js';

/**
 * @typedef {import('@web/dev-server-core').Plugin} Plugin
 */

/**
 * @typedef {import('@web/dev-server-core').DevServerCoreConfig} DevServerCoreConfig
 */

/**
 * @typedef {import('@web/dev-server-core').ErrorWithLocation} ErrorWithLocation
 */

/**
 * Dev server for ES modules.
 */
class DevServer extends CoreDevServer {
    /**
     * @type {import('net').Server|undefined}
     */
    boundServer;

    /**
     * Start the dev server.
     *
     * @param {import('net').Server} [server]
     * @retrun {Promise<void>}
     */
    async start(server) {
        if (!server) {
            return super.start();
        }

        const plugins = this.config.plugins || [];
        for (const plugin of plugins) {
            if (plugin.serverStart) {
                await plugin.serverStart({
                    config: this.config,
                    app: this.koaApp,
                    server: this.server,
                    logger: this.logger,
                    webSockets: this.webSockets,
                    fileWatcher: this.fileWatcher,
                });
            }
        }

        server.on('upgrade', (req, socket, head) => {
            this.webSockets.webSocketServer.handleUpgrade(req, socket, head, (ws) => {
                this.webSockets.webSocketServer.emit('connection', ws, req);
            });
        });

        this.boundServer = server;
    }

    /**
     * Stop the dev server.
     *
     * @retrun {Promise<void>}
     */
    async stop() {
        if (!this.boundServer) {
            return super.stop();
        }

        const plugins = this.config.plugins || [];
        await Promise.all([
            this.fileWatcher.close(),
            plugins.map((plugin) => plugin.serverStop?.()),
        ]);
    }

    /**
     * Create a callback function to use as middleware.
     */
    callback() {
        return this.koaApp.callback();
    }
}

export {
    DevServer,
    getPort,
    portNumbers,
    getRequestFilePath,
    mergePluginHooks,
    PluginError,
    PluginSyntaxError
};
