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

            build.onLoad({ filter: RUNTIME_REGEX }, () => {
                let contents = '';
                if (jsxExport === 'default') {
                    contents = `export { default as ${identifier} } from '${opts.jsxModule}';`;
                } else if (jsxExport === 'namespace') {
                    contents = `export * as ${identifier} from '${opts.jsxModule}';`;
                } else {
                    contents = `export { ${specs.join(',')} } from '${opts.jsxModule}';`;
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
