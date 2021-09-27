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
            const options = build.initialOptions;
            const platform = options.platform || 'neutral';
            const define = { ...(options.define || {}) };

            options.define = {
                this: platform === 'browser' ? 'window' : platform === 'neutral' ? 'globalThis' : 'undefined',
                ...define,
            };
        },
    };

    return plugin;
}
