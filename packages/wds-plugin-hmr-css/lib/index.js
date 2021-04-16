import path from 'path';

/**
 * Create a server plugin for CSS hmr.
 * @return A server plugin.
 */
export function hmrCssPlugin() {
    /**
     * @type {import('@web/dev-server-core').Plugin}
     */
    const plugin = {
        name: 'hmr-css',
        injectWebSocket: true,

        async serverStart({ webSockets, fileWatcher, config }) {
            if (!fileWatcher) {
                throw new Error('Cannot use HMR when watch mode is disabled.');
            }

            if (!webSockets) {
                throw new Error('Cannot use HMR when web sockets are disabled.');
            }

            /**
             * @type {string|undefined}
             */
            let currentFile;

            const send = webSockets.send;
            webSockets.send = function(message) {
                try {
                    let data = JSON.parse(message);
                    if (data.type === 'import' && currentFile) {
                        let relativePath = path.relative(config.rootDir, currentFile);
                        let browserPath = relativePath.split(path.sep).join('/');
                        let content = `var links,i;links=document.querySelectorAll('link[href^="${browserPath}"]');if(links.length){for(i=0;i<links.length;i++){links[i].setAttribute('href','${browserPath}?ts=${Date.now()}');}}else{window.location.reload();}`;
                        data.data.importPath = `data:text/javascript,${content}`;
                        message = JSON.stringify(data);
                        currentFile = undefined;
                    }
                } catch(err) {
                    //
                }

                return send.apply(this, [message]);
            };

            /**
             * @param {string} filePath
             */
            const onFileChanged = (filePath) => {
                if (!filePath.endsWith('.css')) {
                    return;
                }

                currentFile = filePath;
            };

            fileWatcher.on('change', (filePath) => onFileChanged(filePath));
            fileWatcher.on('unlink', (filePath) => onFileChanged(filePath));
        },
    };

    return plugin;
}
