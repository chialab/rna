import { maybeCommonjsModule, maybeMixedModule, transform, wrapDynamicRequire } from '@chialab/cjs-to-esm';

/**
 * Support for dynamic commonjs transformation in Vite dev server.
 * @param {{ optimizeDeps?: boolean }} options
 * @returns {import('vite').Plugin}
 */
export default function commonjs({ optimizeDeps = false } = {}) {
    return {
        name: 'commonjs',

        config(config, env) {
            if (env.command === 'build') {
                return config;
            }

            if (optimizeDeps) {
                return config;
            }

            return {
                ...config,
                optimizeDeps: {
                    ...(config.optimizeDeps || {}),
                    include: [],
                    noDiscovery: true,
                },
            };
        },

        async transform(code, id) {
            if (await maybeMixedModule(code)) {
                return wrapDynamicRequire(code, {
                    source: id,
                    sourcemap: true,
                    sourcesContent: true,
                });
            }

            if (await maybeCommonjsModule(code)) {
                return transform(code, {
                    source: id,
                    sourcemap: true,
                    sourcesContent: true,
                    helperModule: false,
                });
            }
        },
    };
}
