import { readFile } from 'fs/promises';
import pkgUp from 'pkg-up';
import { resolve } from '@chialab/node-resolve';
import { createEmptyModule } from '@chialab/estransform';
import { escapeRegexBody } from '@chialab/esbuild-helpers';

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
            const { sourceRoot, absWorkingDir, platform = 'neutral' } = options;
            const rootDir = sourceRoot || absWorkingDir || process.cwd();
            const modulesMap = { ...modules };

            if (browserField && platform === 'browser') {
                const packageFile = await pkgUp({
                    cwd: rootDir,
                });
                if (packageFile) {
                    const packageJson = JSON.parse(await readFile(packageFile, 'utf-8'));
                    if (typeof packageJson.browser === 'object') {
                        Object.assign(modulesMap, packageJson.browser);
                    }
                }
            }

            const keys = Object.keys(modulesMap);
            const aliases = keys.filter((alias) => modulesMap[alias]);
            const empty = keys.filter((alias) => !modulesMap[alias]);

            if (aliases.length) {
                aliases.forEach((alias) => {
                    const regexBody = escapeRegexBody(alias);
                    const aliasFilter = new RegExp(`^${regexBody}$`);
                    build.onResolve({ filter: aliasFilter }, async (args) => ({
                        path: await resolve(/** @type {string} */(modulesMap[args.path]), args.importer || rootDir),
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
