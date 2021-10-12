import { readFile } from 'fs/promises';
import pkgUp from 'pkg-up';
import { ALIAS_MODE, createAliasRegex, createAliasesRegex, resolve, getMappedModules, getEmptyModules } from '@chialab/node-resolve';
import { createEmptyModule } from '@chialab/estransform';

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
            const options = build.initialOptions;
            const { sourceRoot, absWorkingDir, platform = 'neutral', external = [] } = options;
            const rootDir = sourceRoot || absWorkingDir || process.cwd();
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
                    const aliasFilter = createAliasRegex(alias, ALIAS_MODE.FULL);
                    build.onResolve({ filter: aliasFilter }, async (args) => ({
                        path: await resolve(/** @type {string} */(aliasMap[args.path]), args.importer || rootDir),
                    }));
                });
            }

            if (empty.length) {
                const emptyFilter = createAliasesRegex(empty);

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
