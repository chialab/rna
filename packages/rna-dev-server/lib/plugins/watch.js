/**
 * @return {import('@chialab/es-dev-server').Plugin}
 */
export function watchPlugin() {
    return {
        name: 'watch',
        injectWebSocket: true,

        serverStart({ fileWatcher, webSockets }) {
            if (!webSockets) {
                throw new Error('Cannot use watch mode when web sockets are disabled.');
            }

            const wss = webSockets;
            /**
             * @type {NodeJS.Timeout}
             */
            let timeout;
            function onFileChanged() {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    wss.sendImport('data:text/javascript,window.location.reload()');
                }, 100);
            }

            fileWatcher.addListener('change', onFileChanged);
            fileWatcher.addListener('unlink', onFileChanged);
        },
    };
}
