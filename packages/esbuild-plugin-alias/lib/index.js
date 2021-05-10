/**
 * A plugin for esbuild that resolves aliases or empty modules.
 * @param {{ [key: string]: string | false }} modules
 * @return An esbuild plugin.
 */
export default function(modules = {}) {
    const aliases = Object.keys(modules).filter((alias) => modules[alias]);
    const empty = Object.keys(modules).filter((alias) => !modules[alias]);
    const aliasFilter = new RegExp(`^${aliases.map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}$`);
    const emptyFilter = new RegExp(`^${empty.map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}$`);

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'alias',
        setup(build) {
            build.onResolve({ filter: aliasFilter }, (args) => ({
                path: /** @type {string} */ (modules[args.path]),
            }));

            build.onResolve({ filter: emptyFilter }, (args) => ({
                path: args.path,
                namespace: 'empty',
            }));

            build.onLoad({ filter: emptyFilter, namespace: 'empty' }, () => ({
                contents: 'export default {}\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJtYXBwaW5ncyI6IkEifQ==',
            }));
        },
    };

    return plugin;
}
