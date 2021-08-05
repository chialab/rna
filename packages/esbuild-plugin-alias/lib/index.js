import { resolve } from '@chialab/node-resolve';
import { createEmptyModule } from '@chialab/estransform';
import { escapeRegexBody } from '@chialab/esbuild-helpers';

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
            const options = build.initialOptions;
            const { sourceRoot, absWorkingDir } = options;
            const rootDir = sourceRoot || absWorkingDir || process.cwd();
            if (aliases.length) {
                aliases.forEach((alias) => {
                    const regexBody = escapeRegexBody(alias);
                    const aliasFilter = new RegExp(`^${regexBody}$`);
                    build.onResolve({ filter: aliasFilter }, async (args) => ({
                        path: await resolve(/** @type {string} */(modules[args.path]), args.importer || rootDir),
                    }));
                });
            }

            if (empty.length) {
                const regexBody = empty.map(escapeRegexBody).join('|');
                const emptyFilter = new RegExp(`(^|\\/)${regexBody}(\\/|$)`);

                build.onResolve({ filter: emptyFilter }, (args) => ({
                    path: args.path,
                    namespace: 'empty',
                }));

                build.onLoad({ filter: emptyFilter, namespace: 'empty' }, () => ({
                    contents: createEmptyModule(),
                }));
            }
        },
    };

    return plugin;
}
