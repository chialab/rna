/**
 * A plugin for esbuild that resolves aliases or empty modules.
 * @param {{ [key: string]: string | false }} modules
 * @return An esbuild plugin.
 */
export default function(modules = {}) {
    const aliases = Object.keys(modules);
    const filter = new RegExp(`^${aliases.map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}$`);

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'alias',
        setup(build) {
            build.onResolve({ filter }, (args) => {
                const alias = modules[args.path];
                if (!alias) {
                    return {
                        path: args.path,
                        namespace: 'empty',
                    };
                }

                return {
                    path: /** @type {string} */ (alias),
                };
            });

            build.onLoad({ filter: /\./, namespace: 'empty' }, () => ({
                contents: 'export default {}',
            }));
        },
    };

    return plugin;
}
