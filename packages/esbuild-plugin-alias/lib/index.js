import path from 'path';
import { readFile } from 'fs/promises';
import { createEmptyModule } from '@chialab/estransform';
import { ALIAS_MODE, createAliasRegex, pkgUp } from '@chialab/node-resolve';
import { useRna } from '@chialab/esbuild-rna';

/**
 * Create a module alias.
 * @param {import('esbuild').Plugin} pluginInstance
 * @param {import('esbuild').PluginBuild} pluginBuild
 * @param {string} key
 * @param {import('@chialab/node-resolve').Alias} aliasRule
 * @param {string} [rootDir]
 */
export function addAlias(pluginInstance, pluginBuild, key, aliasRule, rootDir) {
    const isFunction = typeof aliasRule === 'function';
    const aliasFilter = createAliasRegex(key, isFunction ? ALIAS_MODE.START : ALIAS_MODE.FULL);
    const build = useRna(pluginInstance, pluginBuild);

    build.onResolve({ filter: aliasFilter }, async (args) => {
        if (args.pluginData && args.pluginData.includes(aliasFilter)) {
            return;
        }
        if (!aliasRule) {
            return {
                path: args.path,
                namespace: 'empty',
            };
        }

        const aliased = isFunction ? await aliasRule(args.path, args.importer) : aliasRule;

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

        return build.resolve(aliased, {
            importer: args.importer,
            namespace: args.namespace,
            resolveDir: args.resolveDir || rootDir || build.getSourceRoot(),
            kind: args.kind,
            pluginData: [...(args.pluginData || []), aliasFilter],
        });
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
 * @this PluginContext|void
 * @param {import('@chialab/node-resolve').AliasMap} modules
 * @param {boolean} [browserField]
 * @returns An esbuild plugin.
 */
export default function alias(modules = {}, browserField = true) {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: this?.name || 'alias',
        async setup(pluginBuild) {
            const build = useRna(plugin, pluginBuild);
            const { platform = 'neutral', external = [] } = build.getOptions();

            /**
             * @type {import('@chialab/node-resolve').AliasMap}
             */
            const aliasMap = { ...modules };

            if (browserField && platform === 'browser') {
                const packageFile = await pkgUp({
                    cwd: build.getSourceRoot(),
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
                addAlias(plugin, pluginBuild, alias, aliasMap[alias]);
            });

            build.onLoad({ filter: /./, namespace: 'empty' }, () => ({
                contents: createEmptyModule(),
                loader: 'js',
            }));
        },
    };

    return plugin;
}
