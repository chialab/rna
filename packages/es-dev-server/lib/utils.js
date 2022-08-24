/**
 * @typedef {import('@web/dev-server-core').Plugin} Plugin
 */

/**
 * @typedef {Omit<Plugin, 'name'>} PluginPrototype
 */

/**
 * Merge plugin hooks.
 * @param {Plugin[]} plugins
 * @returns A dev server plugin prototype.
 */
export function mergePluginHooks(...plugins) {
    /**
     * @type {PluginPrototype}
     */
    const plugin = {
        async serverStart(args) {
            for (let i = 0; i < plugins.length; i++) {
                const plugin = plugins[i];
                if (plugin.serverStart) {
                    await plugin.serverStart(args);
                }
            }
        },

        async serverStop() {
            for (let i = 0; i < plugins.length; i++) {
                const plugin = plugins[i];
                if (plugin.serverStop) {
                    await plugin.serverStop();
                }
            }
        },

        async serve(context) {
            for (let i = plugins.length - 1; i >= 0; i--) {
                const plugin = plugins[i];
                if (plugin.serve) {
                    const result = await plugin.serve(context);
                    if (result != null) {
                        return result;
                    }
                }
            }
        },

        async transform(context) {
            for (let i = plugins.length - 1; i >= 0; i--) {
                const plugin = plugins[i];
                if (plugin.transform) {
                    const result = await plugin.transform(context);
                    if (result != null) {
                        return result;
                    }
                }
            }
        },

        transformCacheKey(context) {
            for (let i = plugins.length - 1; i >= 0; i--) {
                const plugin = plugins[i];
                if (plugin.transformCacheKey) {
                    const result = plugin.transformCacheKey(context);
                    if (result != null) {
                        return result;
                    }
                }
            }
        },

        async resolveImport(args) {
            for (let i = plugins.length - 1; i >= 0; i--) {
                const plugin = plugins[i];
                if (plugin.resolveImport) {
                    const result = await plugin.resolveImport(args);
                    if (result != null) {
                        return result;
                    }
                }
            }
        },

        async transformImport(args) {
            for (let i = plugins.length - 1; i >= 0; i--) {
                const plugin = plugins[i];
                if (plugin.transformImport) {
                    const result = await plugin.transformImport(args);
                    if (result != null) {
                        return result;
                    }
                }
            }
        },

        async resolveMimeType(args) {
            for (let i = plugins.length - 1; i >= 0; i--) {
                const plugin = plugins[i];
                if (plugin.resolveMimeType) {
                    const result = await plugin.resolveMimeType(args);
                    if (result != null) {
                        return result;
                    }
                }
            }
        },

        fileParsed(context) {
            for (let i = 0; i < plugins.length; i++) {
                const plugin = plugins[i];
                if (plugin.fileParsed) {
                    plugin.fileParsed(context);
                }
            }
        },
    };

    return plugin;
}
