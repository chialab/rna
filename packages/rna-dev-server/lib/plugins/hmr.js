import { hmrPlugin as webHmrPlugin } from '@web/dev-server-hmr';

export function hmrPlugin() {
    const plugin = webHmrPlugin();
    /**
     * Sometimes the cache manager of the hmr plugin does not correctly update dependencies,
     * so we are going to disable it.
     */
    plugin.transformCacheKey = undefined;
    plugin.transformImport = undefined;
    return plugin;
}
