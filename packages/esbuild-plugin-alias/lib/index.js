import { readFile } from 'fs/promises';
import pkgUp from 'pkg-up';
import { getRootDir } from '@chialab/esbuild-helpers';
import { ALIAS_MODE, createAliasRegex, createAliasesRegex, resolve, getMappedModules, getEmptyModules } from '@chialab/node-resolve';
import { createEmptyModule } from '@chialab/estransform';

/**
 * Create a module alias.
 * @param {import('esbuild').PluginBuild} build
 * @param {string} key
 * @param {string} dest
 */
export function addAlias(build, key, dest, rootDir = getRootDir(build)) {
    const aliasFilter = createAliasRegex(key, ALIAS_MODE.FULL);
    build.onResolve({ filter: aliasFilter }, async (args) => ({
        path: await resolve(dest, args.importer || rootDir),
    }));
}

/**
 * Create an alias to an empty module.
 * @param {import('esbuild').PluginBuild} build
 * @param {string[]} keys
 */
export function addEmptyAlias(build, keys) {
    const emptyFilter = createAliasesRegex(keys);

    build.onResolve({ filter: emptyFilter }, (args) => ({
        path: args.path,
        namespace: 'empty',
    }));

    build.onLoad({ filter: emptyFilter, namespace: 'empty' }, () => ({
        contents: createEmptyModule(),
    }));
}

/**
 * A plugin for esbuild that resolves aliases or empty modules.
 * @param {{ [key: string]: string | false }} modules
 * @param {boolean} [browserField]
 * @return An esbuild plugin.
 */
export default function(modules = {}, browserField = true) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'alias',
        async setup(build) {
            const { platform = 'neutral', external = [] } = build.initialOptions;
            const rootDir = getRootDir(build);
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

            const aliases = getMappedModules(aliasMap, external);
            const empty = getEmptyModules(aliasMap, external);

            if (aliases.length) {
                aliases.forEach((alias) => {
                    addAlias(build, alias, /** @type {string} */(aliasMap[alias]));
                });
            }

            if (empty.length) {
                addEmptyAlias(build, empty);
            }
        },
    };

    return plugin;
}
