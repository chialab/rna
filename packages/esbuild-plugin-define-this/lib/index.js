/**
 * Define the this value in an esm module.
 * @return An esbuild plugin.
 */
export default function() {
    /**
     * @type {import('esbuild').Plugin}
     */
    const plugin = {
        name: 'define-this',
        async setup(build) {
            const { platform = 'neutral', define = {} } = build.initialOptions;
            build.initialOptions.define = {
                this: platform === 'browser' ? 'window' : platform === 'neutral' ? 'globalThis' : 'undefined',
                ...define,
            };
        },
    };

    return plugin;
}
