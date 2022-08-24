export function hmrReload() {
    /**
     * @type {import('@chialab/es-dev-server').Plugin}
     */
    const plugin = {
        name: 'hmr-reload',

        async transform(context) {
            if (context.path === '/__web-dev-server__web-socket.js') {
                return `${context.body}\n;import('/__web-dev-server__/hmr.js');`;
            }
        },
    };

    return plugin;
}
