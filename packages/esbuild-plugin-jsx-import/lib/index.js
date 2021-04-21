/**
 * A plugin for esbuild that enables automatic injection of the jsx module import.
 * @param {{ module?: string, export?: 'named'|'namespace'|'default' }} opts
 * @return An esbuild plugin.
 */
export default function(opts = {}) {
    const RUNTIME_ALIAS = '__jsx-runtime__';

    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'jsx-import',
        setup(build) {
            let options = build.initialOptions;
            let { jsxFactory, jsxFragment } = options;

            if (!jsxFactory || !opts || !opts.module) {
                return;
            }

            if (!options.inject || !options.inject.includes(RUNTIME_ALIAS)) {
                options.inject = [
                    RUNTIME_ALIAS,
                    ...(options.inject || []),
                ];
            }

            let identifier = jsxFactory.split('.')[0];
            let specs = [identifier];
            if (jsxFragment) {
                specs.push(jsxFragment.split('.')[0]);
            }

            // force js loader
            build.onLoad({ filter: new RegExp(`${opts.module}\\/.*\\.js$`) }, () => ({
                loader: 'js',
            }));

            build.onLoad({ filter: new RegExp(RUNTIME_ALIAS) }, () => {
                let contents = '';
                if (opts.export === 'default') {
                    contents = `export { default as ${identifier} } from '${opts.module}';`;
                } else if (opts.export === 'namespace') {
                    contents = `export * as ${identifier} from '${opts.module}';`;
                } else {
                    contents = `export { ${specs.join(',')} } from '${opts.module}';`;
                }
                return {
                    contents,
                    loader: 'ts',
                };
            });
        },
    };

    return plugin;
}
