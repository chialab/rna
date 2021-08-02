import { resolve } from '@chialab/node-resolve';

/**
 * A plugin for esbuild that resolves aliases or empty modules.
 * @param {{ [key: string]: string | false }} modules
 * @return An esbuild plugin.
 */
export default function(modules = {}) {
    const keys = Object.keys(modules);
    const aliases = keys.filter((alias) => modules[alias]);
    const empty = keys.filter((alias) => !modules[alias]);

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'alias',
        setup(build) {
            const rootDir = build.initialOptions.sourceRoot || build.initialOptions.absWorkingDir || process.cwd();
            if (aliases.length) {
                aliases.forEach((alias) => {
                    const regexBody = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const aliasFilter = new RegExp(`^${regexBody}$`);
                    build.onResolve({ filter: aliasFilter }, async (args) => ({
                        path: await resolve(/** @type {string} */(modules[args.path]), args.importer || rootDir),
                    }));
                });
            }

            if (empty.length) {
                const emptyFilter = new RegExp(`(^|\\/)${empty.map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}(\\/|$)`);

                build.onResolve({ filter: emptyFilter }, (args) => ({
                    path: args.path,
                    namespace: 'empty',
                }));

                build.onLoad({ filter: emptyFilter, namespace: 'empty' }, () => ({
                    contents: 'export default {}\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJtYXBwaW5ncyI6IkEifQ==',
                }));
            }
        },
    };

    return plugin;
}
