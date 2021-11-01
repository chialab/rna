import path from 'path';
import { readFile } from 'fs/promises';
import pkgUp from 'pkg-up';
import { createEmptyModule } from '@chialab/estransform';
import { ALIAS_MODE, createAliasRegex, resolve } from '@chialab/node-resolve';
import { useRna } from '@chialab/esbuild-rna';

/**
 * Create a module alias.
 * @param {import('esbuild').PluginBuild} build
 * @param {string} key
 * @param {import('@chialab/node-resolve').Alias} dest
 * @param {string} [rootDir]
 */
export function addAlias(build, key, dest, rootDir) {
    const aliasFilter = createAliasRegex(key, ALIAS_MODE.FULL);
    const { rootDir: buildRootDir, onResolve } = useRna(build);

    onResolve({ filter: aliasFilter }, async (args) => {
        const aliased = typeof dest === 'function' ?
            await dest(args.path) :
            dest;

        if (!aliased) {
            return {
                path: args.path,
                namespace: 'empty',
            };
        }

        if (path.isAbsolute(aliased)) {
            return {
                path: aliased,
            };
        }

        return {
            path: await resolve(aliased, args.importer || rootDir || buildRootDir),
        };
    });
}

/**
 * @typedef {{ name?: string }} PluginContext
 */

let instances = 0;

export function createAliasPlugin() {
    return alias.bind({ name: `alias-${instances++}` });
}

/**
 * A plugin for esbuild that resolves aliases or empty modules.
 * @this PluginContext
 * @param {import('@chialab/node-resolve').AliasMap} modules
 * @param {boolean} [browserField]
 * @return An esbuild plugin.
 */
export default function alias(modules = {}, browserField = true) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: this?.name || 'alias',
        async setup(build) {
            const { platform = 'neutral', external = [] } = build.initialOptions;
            const { onLoad, rootDir } = useRna(build);

            /**
             * @type {import('@chialab/node-resolve').AliasMap}
             */
            const aliasMap = { ...modules };

            if (browserField && platform === 'browser') {
                const packageFile = await pkgUp({
                    cwd: rootDir,
                });
                if (packageFile) {
                    const packageJson = JSON.parse(await readFile(packageFile, 'utf-8'));
                    if (typeof packageJson.browser === 'object') {
                        Object.assign(aliasMap, packageJson.browser);
                    }
                }
            }

            external.forEach((ext) => {
                delete aliasMap[ext];
            });

            Object.keys(aliasMap).forEach((alias) => {
                addAlias(build, alias, aliasMap[alias]);
            });

            onLoad({ filter: /./, namespace: 'empty' }, () => ({
                contents: createEmptyModule(),
            }));
        },
    };

    return plugin;
}
