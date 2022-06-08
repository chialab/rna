import { createEmptySourcemapComment } from '@chialab/estransform';
import { escapeRegexBody } from '@chialab/node-resolve';

const DEFAULT_FACTORY = 'React.createElement';
const DEFAULT_FRAGMENT = 'React.Fragment';

/**
 * A plugin for esbuild that enables automatic injection of the jsx module import.
 * @param {{ jsxModule?: string, jsxExport?: 'named'|'namespace'|'default' }} opts
 * @returns An esbuild plugin.
 */
export default function(opts = {}) {
    const RUNTIME_ALIAS = '__jsx-runtime__.js';
    const RUNTIME_REGEX = new RegExp(escapeRegexBody(RUNTIME_ALIAS));

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'jsx-import',
        setup(build) {
            const {
                inject = [],
                jsxFactory = DEFAULT_FACTORY,
                jsxFragment = jsxFactory === DEFAULT_FACTORY ? DEFAULT_FRAGMENT : undefined,
            } = build.initialOptions;

            if (!opts || !opts.jsxModule) {
                if (inject.includes(RUNTIME_ALIAS)) {
                    inject.splice(inject.indexOf(RUNTIME_ALIAS), 1);
                }
                return;
            }

            const jsxModule = opts.jsxModule;
            const jsxExport = opts.jsxExport || jsxFactory === DEFAULT_FACTORY ? 'default' : undefined;

            if (!inject.includes(RUNTIME_ALIAS)) {
                build.initialOptions.inject = [
                    RUNTIME_ALIAS,
                    ...inject,
                ];
            }

            const identifier = jsxFactory.split('.')[0];
            const specs = [identifier];
            if (jsxFragment) {
                specs.push(jsxFragment.split('.')[0]);
            }

            build.onResolve({ filter: /^__jsx__.js$/ }, async (args) => {
                const options = { ...args, path: undefined };
                delete options.path;

                const resolveModule = await build.resolve(jsxModule, options);
                return {
                    ...resolveModule,
                    sideEffects: false,
                };
            });

            build.onLoad({ filter: RUNTIME_REGEX }, () => {
                let contents = '';
                if (jsxExport === 'default') {
                    contents = `export { default as ${identifier} } from '__jsx__.js';`;
                } else if (jsxExport === 'namespace') {
                    contents = `export * as ${identifier} from '__jsx__.js';`;
                } else {
                    contents = `export { ${specs.join(',')} } from '__jsx__.js';`;
                }

                contents += createEmptySourcemapComment();

                return {
                    contents,
                    loader: 'ts',
                };
            });
        },
    };

    return plugin;
}
